// AI Summary Server Actions
// EPIC 9: Daily AI Summary Generator (US-9.1, US-9.2, US-9.3, US-9.5, US-9.6)
// All actions require 'supervisor' or 'admin' role.

'use server'

import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { logger } from '@/shared/config/logger'
import { aggregateDailyStats } from '../lib/aggregate-stats'
import { generateAISummary } from '../lib/openai-client'
import { upsertSummary, approveSummary, rejectSummary } from '../lib/summary-mutations'
import { getSummaryByDate, listSummaries } from '../lib/summary-queries'
import {
  generateSummarySchema,
  approveSummarySchema,
  rejectSummarySchema,
} from '../schemas/summary-schemas'
import type { GenerateSummaryInput, ApproveSummaryInput, RejectSummaryInput } from '../schemas/summary-schemas'
import type { DailySummary } from '../types/summary'

/** Derive yesterday's date as YYYY-MM-DD (UTC) */
function yesterday(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

/**
 * US-9.1 / US-9.2: Aggregate stats and generate AI text for a date.
 * Idempotent — re-running regenerates the summary (unless already approved/rejected).
 */
export async function generateSummaryAction(input: GenerateSummaryInput = {}): Promise<{
  success: boolean
  summaryId?: string
  error?: string
}> {
  try {
    const session = await requireRole(['supervisor', 'admin'])
    const parsed = generateSummarySchema.safeParse(input)
    if (!parsed.success) return { success: false, error: Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? 'Invalid input' }

    const dateStr = parsed.data.summaryDate ?? yesterday()
    const stats = await aggregateDailyStats(new Date(`${dateStr}T00:00:00Z`))
    const aiResult = await generateAISummary(stats)
    const summaryId = await upsertSummary(stats, aiResult)

    await logAudit({
      actionType: 'CREATE',
      entityType: 'daily_summary',
      entityId: summaryId,
      performedBy: session.userId,
      changes: { date: dateStr, aiModel: aiResult.model },
    })

    return { success: true, summaryId }
  } catch (error) {
    logger.error('generateSummaryAction failed', error as Error)
    return { success: false, error: 'Failed to generate summary' }
  }
}

/**
 * US-9.3 / US-9.5: Supervisor approves (and optionally edits) a draft summary.
 */
export async function approveSummaryAction(input: ApproveSummaryInput): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const session = await requireRole(['supervisor', 'admin'])
    const parsed = approveSummarySchema.safeParse(input)
    if (!parsed.success) return { success: false, error: Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? 'Invalid input' }

    const { summaryId, reviewedText, supervisorNotes } = parsed.data
    await approveSummary(summaryId, session.userId, reviewedText, supervisorNotes)

    await logAudit({
      actionType: 'UPDATE',
      entityType: 'daily_summary',
      entityId: summaryId,
      performedBy: session.userId,
      changes: { status: 'approved' },
    })

    return { success: true }
  } catch (error) {
    logger.error('approveSummaryAction failed', error as Error)
    return { success: false, error: 'Failed to approve summary' }
  }
}

/**
 * US-9.5: Supervisor rejects a draft summary with a reason.
 */
export async function rejectSummaryAction(input: RejectSummaryInput): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const session = await requireRole(['supervisor', 'admin'])
    const parsed = rejectSummarySchema.safeParse(input)
    if (!parsed.success) return { success: false, error: Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? 'Invalid input' }

    const { summaryId, rejectionReason } = parsed.data
    await rejectSummary(summaryId, session.userId, rejectionReason)

    await logAudit({
      actionType: 'UPDATE',
      entityType: 'daily_summary',
      entityId: summaryId,
      performedBy: session.userId,
      changes: { status: 'rejected', rejectionReason },
    })

    return { success: true }
  } catch (error) {
    logger.error('rejectSummaryAction failed', error as Error)
    return { success: false, error: 'Failed to reject summary' }
  }
}

/**
 * US-9.6: List past summaries for the history view.
 */
export async function listSummariesAction(limit = 30, offset = 0): Promise<{
  success: boolean
  summaries?: DailySummary[]
  error?: string
}> {
  try {
    await requireRole(['supervisor', 'admin'])
    const summaries = await listSummaries(limit, offset)
    return { success: true, summaries }
  } catch (error) {
    logger.error('listSummariesAction failed', error as Error)
    return { success: false, error: 'Failed to load summaries' }
  }
}

/**
 * US-9.3 / US-9.5: Fetch summary for a specific date (for the review page).
 */
export async function getSummaryByDateAction(date: string): Promise<{
  success: boolean
  summary?: DailySummary | null
  error?: string
}> {
  try {
    await requireRole(['supervisor', 'admin'])
    const summary = await getSummaryByDate(date)
    return { success: true, summary }
  } catch (error) {
    logger.error('getSummaryByDateAction failed', error as Error)
    return { success: false, error: 'Failed to load summary' }
  }
}
