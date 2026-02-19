'use server'

import { requireRole } from '@/shared/lib/auth'
import { logger } from '@/shared/config/logger'
import {
  fetchAuditorHistory,
  type FetchAuditorHistoryOptions,
  type AuditorHistoryRecord,
} from '../lib/auditor-history-queries'
import { generateAuditorHistoryCSV } from '../lib/csv-generators'

export async function fetchAuditorBedHistory(
  options: FetchAuditorHistoryOptions
): Promise<{
  success: boolean
  data?: {
    rows: AuditorHistoryRecord[]
    totalCount: number
  }
  error?: string
}> {
  try {
    const session = await requireRole(['supervisor', 'admin', 'auditor'])
    const data = await fetchAuditorHistory(options)

    logger.info('Fetched auditor bed history', {
      userId: session.userId,
      count: data.rows.length,
      totalCount: data.totalCount,
    })

    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch auditor history'
    logger.error('Failed to fetch auditor bed history', error as Error)
    return { success: false, error: message }
  }
}

export async function exportAuditorBedHistoryCSV(
  options: Omit<FetchAuditorHistoryOptions, 'limit' | 'offset'>
): Promise<{
  success: boolean
  data?: string
  error?: string
}> {
  try {
    const session = await requireRole(['supervisor', 'admin', 'auditor'])
    const result = await fetchAuditorHistory({
      ...options,
      limit: 5000,
      offset: 0,
    })

    logger.info('Exported auditor bed history CSV', {
      userId: session.userId,
      count: result.rows.length,
    })

    return {
      success: true,
      data: generateAuditorHistoryCSV(result.rows),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export auditor history'
    logger.error('Failed to export auditor history CSV', error as Error)
    return { success: false, error: message }
  }
}