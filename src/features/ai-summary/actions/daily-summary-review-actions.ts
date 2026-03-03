'use server'

// Server Actions — EPIC 9 (US-9.2, US-9.3)
// Supervisor review workflow: approve, reject, edit draft, flag insight.
//
// NOTE: approveSummary() also calls createSignOff() from management-report to
// keep the two approval systems in sync (Conflict-2 fix). This cross-feature
// import is intentional and documented — see feature_conflicts.md §Conflict 2.

import { logger } from '@/shared/config/logger'
import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import {
    approveSummarySchema,
    rejectSummarySchema,
    updateSummaryDraftSchema,
    flagInsightSchema,
} from '../schemas/review-summary'
import { getDailySummaryById } from '../lib/daily-summary-store'
import {
    updateDailySummaryStatus,
    updateSummaryDraft,
    flagInsight,
    getDraftSummariesPendingReview,
} from '../lib/daily-summary-review-store'
// Cross-feature import (ai-summary → management-report): required to sync sign-off
// records when an AI summary is approved. Sign-off creation is non-fatal.
import { createSignOff } from '@/shared/lib/signoff-queries'
import type { DailySummary } from '../types/daily-summary'

type ActionResult = { success: boolean; summary?: DailySummary; error?: string }

export async function approveSummary(rawInput: { id: string }): Promise<ActionResult> {
    try {
        const session = await requireRole(['admin', 'supervisor'])
        const parsed = approveSummarySchema.safeParse(rawInput)
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
        }
        const summary = await updateDailySummaryStatus(
            parsed.data.id, 'published', session.userId
        )
        if (!summary) return { success: false, error: 'Summary not found or not draft' }
        await logAudit({
            actionType: 'DAILY_SUMMARY_APPROVED',
            entityType: 'daily_summary',
            entityId: summary.id,
            performedBy: session.userId,
        })

        // Sync: auto-create a report sign-off so management-report and ai-summary
        // approval statuses stay consistent. Non-fatal — approval already succeeded.
        try {
            await createSignOff({
                reportDate: summary.summaryDate,
                reportType: 'daily',
                userId: session.userId,
                notes: 'Auto-created when AI summary was approved',
            })
        } catch (signOffError) {
            logger.warn('[ai-summary] approveSummary: sign-off sync failed (non-fatal)', {
                summaryId: summary.id,
                date: summary.summaryDate,
                error: signOffError instanceof Error ? signOffError.message : String(signOffError),
            })
        }

        return { success: true, summary }
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Approve failed'
        logger.error('[ai-summary] approveSummary failed', error as Error)
        return { success: false, error: msg }
    }
}

export async function rejectSummary(rawInput: { id: string; reason?: string }): Promise<ActionResult> {
    try {
        const session = await requireRole(['admin', 'supervisor'])
        const parsed = rejectSummarySchema.safeParse(rawInput)
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
        }
        const summary = await updateDailySummaryStatus(
            parsed.data.id, 'rejected', session.userId
        )
        if (!summary) return { success: false, error: 'Summary not found or not draft' }
        await logAudit({
            actionType: 'DAILY_SUMMARY_REJECTED',
            entityType: 'daily_summary',
            entityId: summary.id,
            performedBy: session.userId,
            metadata: { reason: parsed.data.reason },
        })
        return { success: true, summary }
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Reject failed'
        logger.error('[ai-summary] rejectSummary failed', error as Error)
        return { success: false, error: msg }
    }
}

export async function updateSummaryDraftAction(
    rawInput: { id: string; aiSummary: string; aiInsights: { id: string; text: string; confidence: number; category?: string; flagged?: boolean }[] }
): Promise<ActionResult> {
    try {
        await requireRole(['admin', 'supervisor'])
        const parsed = updateSummaryDraftSchema.safeParse(rawInput)
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
        }
        const existing = await getDailySummaryById(parsed.data.id)
        if (!existing) return { success: false, error: 'Summary not found' }
        if (existing.status !== 'draft') {
            return { success: false, error: 'Only drafts can be edited' }
        }
        const summary = await updateSummaryDraft(
            parsed.data.id,
            parsed.data.aiSummary,
            parsed.data.aiInsights
        )
        if (!summary) return { success: false, error: 'Update failed' }
        return { success: true, summary }
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Update failed'
        logger.error('[ai-summary] updateSummaryDraft failed', error as Error)
        return { success: false, error: msg }
    }
}

export async function flagInsightAction(
    rawInput: { summaryId: string; insightId: string }
): Promise<ActionResult> {
    try {
        await requireRole(['admin', 'supervisor'])
        const parsed = flagInsightSchema.safeParse(rawInput)
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
        }
        const summary = await flagInsight(parsed.data.summaryId, parsed.data.insightId)
        if (!summary) return { success: false, error: 'Summary or insight not found' }
        return { success: true, summary }
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Flag failed'
        logger.error('[ai-summary] flagInsight failed', error as Error)
        return { success: false, error: msg }
    }
}

export async function fetchDailySummaryById(
    id: string
): Promise<{ success: boolean; summary?: DailySummary | null; error?: string }> {
    try {
        const session = await requireRole(['admin', 'supervisor', 'auditor'])
        const summary = await getDailySummaryById(id)
        if (session.role === 'auditor' && summary?.status !== 'published') {
            return { success: true, summary: null }
        }
        return { success: true, summary: summary ?? null }
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Fetch failed'
        logger.error('[ai-summary] fetchDailySummaryById failed', error as Error)
        return { success: false, error: msg }
    }
}

export async function fetchDraftSummariesPendingReview(
    limit: number = 30
): Promise<{ success: boolean; summaries?: DailySummary[]; error?: string }> {
    try {
        await requireRole(['admin', 'supervisor', 'auditor'])
        const summaries = await getDraftSummariesPendingReview(limit)
        return { success: true, summaries }
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Fetch failed'
        logger.error('[ai-summary] fetchDraftSummaries failed', error as Error)
        return { success: false, error: msg }
    }
}
