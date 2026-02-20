'use server'
// Turnaround Time (TAT) Server Actions
// US-2.4: Track Bed Cleaning and Turnaround Time
//
// Two TAT APIs coexist:
//  1. Upstream analytics (fetchTATSummary/fetchTATRecords) — used by StageAnalyticsView
//  2. US-2.4 cleaning TAT (markBedClean/fetchTatSummary/fetchTatRecords) — used by BedDashboardClient

import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { logger } from '@/shared/config/logger'
import { query } from '@/shared/lib/db'
import { updateBedStageInDB } from '../lib/bed-mutations'
import { getTATSummary, getTATRecords } from '../lib/tat-queries'
import { getTatSummary, getCompletedTatRecords } from '../lib/tat-cleaning-queries'
import type { TATSummary, TATRecord } from '../lib/tat-queries'
import type { TatRecord, TatSummary } from '../types/bed'

// ──── Upstream analytics TAT (StageAnalyticsView / useAnalyticsData) ────

export interface FetchTATSummaryResult {
  success: boolean
  data?: TATSummary
  error?: string
}

export interface FetchTATRecordsResult {
  success: boolean
  data?: TATRecord[]
  error?: string
}

export async function fetchTATSummary(options?: {
  startDate?: Date
  endDate?: Date
}): Promise<FetchTATSummaryResult> {
  try {
    await requireRole(['supervisor', 'admin'])
    const summary = await getTATSummary(options?.startDate, options?.endDate)
    logger.info('TAT summary fetched', { totalCycles: summary.totalCycles })
    return { success: true, data: summary }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch TAT summary'
    logger.error('fetchTATSummary failed', error as Error)
    return { success: false, error: message }
  }
}

export async function fetchTATRecords(options?: {
  startDate?: Date
  endDate?: Date
  limit?: number
}): Promise<FetchTATRecordsResult> {
  try {
    await requireRole(['supervisor', 'admin'])
    const records = await getTATRecords(options?.startDate, options?.endDate)
    const limited = options?.limit ? records.slice(0, options.limit) : records
    logger.info('TAT records fetched', { count: limited.length })
    return { success: true, data: limited }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch TAT records'
    logger.error('fetchTATRecords failed', error as Error)
    return { success: false, error: message }
  }
}

// ──── US-2.4: Cleaning TAT (BedDashboardClient / TatAnalyticsView) ────

/** Mark a bed as clean (Cleaning → Empty transition) */
export async function markBedClean(bedId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const session = await requireRole(['nurse', 'supervisor', 'admin'])
    const stageResult = await query<{ id: string }>(
      `SELECT id FROM stages WHERE LOWER(name) = 'empty' AND is_active = true LIMIT 1`
    )

    if (stageResult.rows.length === 0) {
      return { success: false, error: 'Empty stage not found in system' }
    }

    const emptyStageId = stageResult.rows[0].id
    const result = await updateBedStageInDB({
      bedId,
      toStageId: emptyStageId,
      changedByUserId: session.userId,
      notes: 'Bed marked clean — ready for next patient',
    })

    await logAudit({
      actionType: 'UPDATE',
      entityType: 'bed',
      entityId: bedId,
      performedBy: session.userId,
      changes: { action: 'mark_clean', fromStageId: result.fromStageId, toStageId: result.toStageId },
      reason: 'Bed cleaning completed',
    })

    logger.info('Bed marked clean', { bedId, changedBy: session.userId })
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to mark bed as clean'
    logger.error('Failed to mark bed clean', error as Error, { bedId })
    return { success: false, error: message }
  }
}

/** Fetch TAT summary stats for the dashboard (hoursBack window) */
export async function fetchTatSummary(hoursBack: number = 24): Promise<{
  success: boolean
  data?: TatSummary
  error?: string
}> {
  try {
    await requireRole(['nurse', 'supervisor', 'admin'])
    const summary = await getTatSummary(hoursBack)
    return { success: true, data: summary }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch TAT summary'
    logger.error('Failed to fetch TAT summary', error as Error)
    return { success: false, error: message }
  }
}

/** Fetch completed TAT records for analytics (hoursBack window) */
export async function fetchTatRecords(hoursBack: number = 24): Promise<{
  success: boolean
  data?: TatRecord[]
  error?: string
}> {
  try {
    await requireRole(['supervisor', 'admin'])
    const records = await getCompletedTatRecords(hoursBack)
    return { success: true, data: records }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch TAT records'
    logger.error('Failed to fetch TAT records', error as Error)
    return { success: false, error: message }
  }
}
