'use server'
// Full-Cycle Turnaround Time (TAT) Server Actions
// US-3.4: Track Bed Turnaround Time
// Epic 3: Time Tracking & Stage Logging
//
// Exposes full-cycle TAT data (discharge → next admission) to the UI.
// Queries: tat-cycle-queries.ts

import { requireRole } from '@/shared/lib/auth'
import { logger } from '@/shared/config/logger'
import {
  getFullCycleTatSummary,
  getFullCycleTatRecords,
} from '../lib/tat-cycle-queries'
import type {
  FullCycleTatSummary,
  FullCycleTatRecord,
} from '../lib/tat-cycle-queries'

export type { FullCycleTatSummary, FullCycleTatRecord }

export interface FetchFullCycleTatSummaryResult {
  success: boolean
  data?: FullCycleTatSummary
  error?: string
}

export interface FetchFullCycleTatRecordsResult {
  success: boolean
  data?: FullCycleTatRecord[]
  error?: string
}

/**
 * Fetch aggregate full-cycle TAT statistics.
 * Requires supervisor or admin role.
 */
export async function fetchFullCycleTatSummary(options?: {
  startDate?: Date
  endDate?: Date
}): Promise<FetchFullCycleTatSummaryResult> {
  try {
    await requireRole(['supervisor', 'admin'])
    const summary = await getFullCycleTatSummary(
      options?.startDate,
      options?.endDate
    )
    logger.info('Full-cycle TAT summary fetched', {
      totalCycles: summary.totalCycles,
    })
    return { success: true, data: summary }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch full-cycle TAT summary'
    logger.error('fetchFullCycleTatSummary failed', error as Error)
    return { success: false, error: message }
  }
}

/**
 * Fetch individual full-cycle TAT records.
 * Requires supervisor or admin role.
 */
export async function fetchFullCycleTatRecords(options?: {
  startDate?: Date
  endDate?: Date
  limit?: number
}): Promise<FetchFullCycleTatRecordsResult> {
  try {
    await requireRole(['supervisor', 'admin'])
    const records = await getFullCycleTatRecords(
      options?.startDate,
      options?.endDate,
      options?.limit
    )
    logger.info('Full-cycle TAT records fetched', { count: records.length })
    return { success: true, data: records }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch full-cycle TAT records'
    logger.error('fetchFullCycleTatRecords failed', error as Error)
    return { success: false, error: message }
  }
}
