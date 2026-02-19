'use server'
// Turnaround Time (TAT) Actions
// US-2.4: Track Bed Cleaning and Turnaround Time
// Epic 2: One-Click Stage Update System
//
// Separated from analytics-actions.ts to respect the 200-line file limit.

import { requireRole } from '@/shared/lib/auth'
import { logger } from '@/shared/config/logger'
import { getTATSummary, getTATRecords } from '../lib/tat-queries'
import type { TATSummary, TATRecord } from '../lib/tat-queries'

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

/**
 * Fetch aggregate TAT statistics — accessible by supervisor and admin.
 * Supervisors use this to monitor how fast beds are turned around.
 */
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

/**
 * Fetch individual TAT records for per-bed analysis — supervisor/admin only.
 * Returns most-recent cycles first, up to `limit` rows.
 */
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
