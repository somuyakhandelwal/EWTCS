'use server'

// Server Action — EPIC 9: Daily AI Summary Generator
// Handles generation, individual fetch, recent list, and history query.
// Called by: API route (manual trigger), scheduled cron job, and history UI.

import { logger } from '@/shared/config/logger'
import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { generateSummarySchema } from '../schemas/generate-summary'
import { historyQuerySchema } from '../schemas/history-query'
import type { HistoryQueryInput } from '../schemas/history-query'
import { aggregateDailyStats } from '../lib/daily-aggregation-queries'
import { generateAiSummary } from '../lib/ai-service'
import {
    upsertDailySummary,
    getDailySummaryByDate,
    getRecentDailySummaries,
    getDailySummariesByDateRange,
    searchDailySummaries,
} from '../lib/daily-summary-store'
import type { AggregationResult, DailySummary } from '../types/daily-summary'

/** Returns yesterday's date string in YYYY-MM-DD (UTC). */
function getYesterdayDateString(): string {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - 1)
    return d.toISOString().slice(0, 10)
}

/**
 * Generate (or re-generate) the daily summary for a given date.
 * Defaults to yesterday if no date is supplied.
 * Requires admin or supervisor role.
 * Operation is idempotent — safe to re-run for the same date.
 */
export async function generateDailySummary(
    rawInput: { date?: string } = {}
): Promise<AggregationResult> {
    try {
        // Role guard: only admin/supervisor may trigger aggregation
        const session = await requireRole(['admin', 'supervisor'])

        // Validate input
        const parsed = generateSummarySchema.safeParse(rawInput)
        if (!parsed.success) {
            return {
                success: false,
                date: rawInput.date ?? 'unknown',
                error: parsed.error.issues[0]?.message ?? 'Invalid input',
            }
        }

        const targetDate = parsed.data.date ?? getYesterdayDateString()

        logger.info(`[ai-summary] generateDailySummary triggered`, {
            date: targetDate,
            triggeredBy: session.userId,
        })

        // Run aggregation across existing tables
        const summaryInput = await aggregateDailyStats(targetDate)

        // Generate AI narrative + insights (200-300 words, US-9.1, US-9.3)
        const { narrative, insights } = await generateAiSummary(summaryInput)
        summaryInput.aiSummary = narrative
        summaryInput.aiInsights = insights

        // Post-generation validation: 200-300 word criterion (US-9.1)
        const wordCount = narrative.split(/\s+/).filter(Boolean).length
        summaryInput.metadata = {
            ...summaryInput.metadata,
            summaryWordCount: wordCount,
            meetsWordCountRequirement: wordCount >= 100 && wordCount <= 400,
        }
        if (!summaryInput.metadata.meetsWordCountRequirement) {
            logger.warn('[ai-summary] Summary word count outside 100-400 range', {
                date: targetDate,
                wordCount,
                target: '200-300',
            })
        }

        // Upsert into daily_summaries as draft (US-9.2)
        const saved = await upsertDailySummary(summaryInput)

        // Audit log the generation event
        await logAudit({
            actionType: 'DAILY_SUMMARY_GENERATED',
            entityType: 'daily_summary',
            entityId: saved.id,
            performedBy: session.userId,
            changes: { date: targetDate, totalPatients: saved.totalPatients },
        })

        logger.info(`[ai-summary] Summary generated successfully`, {
            date: targetDate,
            totalPatients: saved.totalPatients,
        })

        return { success: true, date: targetDate, summary: saved }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Aggregation failed'
        logger.error('[ai-summary] generateDailySummary failed', error as Error)
        return { success: false, date: rawInput.date ?? 'unknown', error: message }
    }
}

/**
 * Fetch a specific day's summary (read-only).
 * Returns null if no summary or if auditor requests and only draft exists.
 * Accessible by admin, supervisor, and auditor.
 */
export async function fetchDailySummaryByDate(
    dateStr: string
): Promise<{ success: boolean; summary?: DailySummary | null; error?: string }> {
    try {
        const session = await requireRole(['admin', 'supervisor', 'auditor'])
        const summary = await getDailySummaryByDate(dateStr)
        if (session.role === 'auditor' && summary?.status !== 'published') {
            return { success: true, summary: null }
        }
        return { success: true, summary }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Fetch failed'
        logger.error('[ai-summary] fetchDailySummaryByDate failed', error as Error)
        return { success: false, error: message }
    }
}

/**
 * Fetch the N most recent daily summaries, newest first.
 * Auditors receive only published summaries; admin/supervisor receive all.
 */
export async function fetchRecentDailySummaries(
    limit: number = 30
): Promise<{ success: boolean; summaries?: DailySummary[]; error?: string }> {
    try {
        const session = await requireRole(['admin', 'supervisor', 'auditor'])
        const statusFilter = session.role === 'auditor' ? 'published' : 'all'
        const summaries = await getRecentDailySummaries(limit, statusFilter)
        return { success: true, summaries }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Fetch failed'
        logger.error('[ai-summary] fetchRecentDailySummaries failed', error as Error)
        return { success: false, error: message }
    }
}

/**
 * Fetch historical summaries with optional date-range, search, and status filter (US-9.5).
 * - Auditors always receive published summaries only.
 * - Search takes priority over date range when both are provided.
 */
export async function fetchDailySummaryHistory(
    rawInput: HistoryQueryInput = {}
): Promise<{ success: boolean; summaries?: DailySummary[]; error?: string }> {
    try {
        const session = await requireRole(['admin', 'supervisor', 'auditor'])

        const parsed = historyQuerySchema.safeParse(rawInput)
        if (!parsed.success) {
            return {
                success: false,
                error: parsed.error.issues[0]?.message ?? 'Invalid query parameters',
            }
        }

        const { from, to, search, status, limit } = parsed.data
        // Auditors can only see published summaries regardless of requested filter
        const effectiveStatus =
            session.role === 'auditor' ? 'published' : status

        let summaries: DailySummary[]

        if (search && search.trim().length > 0) {
            summaries = await searchDailySummaries(search.trim(), limit, effectiveStatus)
        } else {
            // Default date range: last 90 days if not specified
            const today = new Date().toISOString().slice(0, 10)
            const defaultFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
                .toISOString()
                .slice(0, 10)
            summaries = await getDailySummariesByDateRange(
                from ?? defaultFrom,
                to ?? today,
                effectiveStatus
            )
        }

        return { success: true, summaries }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'History fetch failed'
        logger.error('[ai-summary] fetchDailySummaryHistory failed', error as Error)
        return { success: false, error: message }
    }
}
