'use server'

// Server Action — EPIC 9: Daily AI Summary Generator
// Composes aggregation queries + upsert into a single callable action.
// Called by: API route (manual trigger) and scheduled cron job.

import { logger } from '@/shared/config/logger'
import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { generateSummarySchema } from '../schemas/generate-summary'
import { aggregateDailyStats } from '../lib/daily-aggregation-queries'
import { generateAiSummaryText } from '../lib/ai-service'
import { upsertDailySummary, getDailySummaryByDate, getRecentDailySummaries } from '../lib/daily-summary-store'
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

        // Generate AI text summary from the aggregated stats
        summaryInput.aiSummary = await generateAiSummaryText(summaryInput)

        // Upsert into daily_summaries (idempotent ON CONFLICT DO UPDATE)
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
 * Returns null if no summary has been generated for that date.
 * Accessible by admin, supervisor, and auditor.
 */
export async function fetchDailySummaryByDate(
    dateStr: string
): Promise<{ success: boolean; summary?: DailySummary | null; error?: string }> {
    try {
        await requireRole(['admin', 'supervisor', 'auditor'])
        const summary = await getDailySummaryByDate(dateStr)
        return { success: true, summary }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Fetch failed'
        logger.error('[ai-summary] fetchDailySummaryByDate failed', error as Error)
        return { success: false, error: message }
    }
}

/**
 * Fetch the N most recent daily summaries, newest first.
 * Accessible by admin, supervisor, and auditor.
 */
export async function fetchRecentDailySummaries(
    limit: number = 30
): Promise<{ success: boolean; summaries?: DailySummary[]; error?: string }> {
    try {
        await requireRole(['admin', 'supervisor', 'auditor'])
        const summaries = await getRecentDailySummaries(limit)
        return { success: true, summaries }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Fetch failed'
        logger.error('[ai-summary] fetchRecentDailySummaries failed', error as Error)
        return { success: false, error: message }
    }
}
