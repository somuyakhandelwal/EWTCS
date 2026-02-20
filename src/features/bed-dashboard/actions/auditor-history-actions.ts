'use server'

import { requireRole } from '@/shared/lib/auth'
import { logger } from '@/shared/config/logger'
import {
  fetchAuditorHistory,
  type FetchAuditorHistoryOptions,
  type AuditorHistoryRecord,
} from '../lib/auditor-history-queries'
import { generateAuditorHistoryCSV } from '../lib/csv-generators'

const EXPORT_BATCH_SIZE = 500

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
    const rows: AuditorHistoryRecord[] = []
    let offset = 0
    let totalCount = 0

    while (true) {
      const result = await fetchAuditorHistory({
        ...options,
        limit: EXPORT_BATCH_SIZE,
        offset,
      })

      if (offset === 0) {
        totalCount = result.totalCount
      }

      rows.push(...result.rows)

      if (rows.length >= totalCount || result.rows.length === 0) {
        break
      }

      offset += EXPORT_BATCH_SIZE
    }

    logger.info('Exported auditor bed history CSV', {
      userId: session.userId,
      count: rows.length,
    })

    return {
      success: true,
      data: generateAuditorHistoryCSV(rows),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export auditor history'
    logger.error('Failed to export auditor history CSV', error as Error)
    return { success: false, error: message }
  }
}