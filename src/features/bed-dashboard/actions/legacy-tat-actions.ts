'use server'

import { requireRole } from '@/shared/lib/auth'
import { logger } from '@/shared/config/logger'
import { getTATSummary, getTATRecords } from '../lib/tat-queries'
import { getTatSummary, getCompletedTatRecords } from '../lib/tat-cleaning-queries'
import type { TATSummary, TATRecord } from '../lib/tat-queries'
import type { TatRecord, TatSummary } from '../types/bed'

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
    await requireRole(['supervisor', 'admin', 'auditor'])
    const summary = await getTATSummary(options?.startDate, options?.endDate)
    logger.info('TAT summary fetched', { totalCycles: summary.totalCycles })
    return { success: true, data: summary }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch TAT summary'
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
    await requireRole(['supervisor', 'admin', 'auditor'])
    const records = await getTATRecords(options?.startDate, options?.endDate)
    const limited = options?.limit ? records.slice(0, options.limit) : records
    logger.info('TAT records fetched', { count: limited.length })
    return { success: true, data: limited }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch TAT records'
    logger.error('fetchTATRecords failed', error as Error)
    return { success: false, error: message }
  }
}

export async function fetchTatSummary(hoursBack: number = 24): Promise<{
  success: boolean
  data?: TatSummary
  error?: string
}> {
  try {
    await requireRole(['nurse', 'supervisor', 'admin', 'auditor'])
    const summary = await getTatSummary(hoursBack)
    return { success: true, data: summary }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch TAT summary'
    logger.error('Failed to fetch TAT summary', error as Error)
    return { success: false, error: message }
  }
}

export async function fetchTatRecords(hoursBack: number = 24): Promise<{
  success: boolean
  data?: TatRecord[]
  error?: string
}> {
  try {
    await requireRole(['supervisor', 'admin', 'auditor'])
    const records = await getCompletedTatRecords(hoursBack)
    return { success: true, data: records }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch TAT records'
    logger.error('Failed to fetch TAT records', error as Error)
    return { success: false, error: message }
  }
}
