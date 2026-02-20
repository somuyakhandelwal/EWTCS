'use server'
// Stage-Wise Delay Server Actions (US-10.5)
// Epic 10: Management Report Dashboard
//
// Accessible by supervisor, admin, and auditor (read-only).

import { requireRole } from '@/shared/lib/auth'
import { logger } from '@/shared/config/logger'
import { getStageDelayReport } from '../lib/stage-delay-queries'
import type { StageDelayReport } from '../types/report.types'

export interface FetchStageDelayResult {
  success: boolean
  data?: StageDelayReport
  error?: string
}

/**
 * Fetch stage-wise delay statistics for the management report.
 */
export async function fetchStageDelayReport(params: {
  startDate?: Date | string | null
  endDate?: Date | string | null
}): Promise<FetchStageDelayResult> {
  try {
    await requireRole(['supervisor', 'admin', 'auditor'])

    const start =
      params.startDate
        ? typeof params.startDate === 'string'
          ? new Date(params.startDate)
          : params.startDate
        : undefined

    const end =
      params.endDate
        ? typeof params.endDate === 'string'
          ? new Date(params.endDate)
          : params.endDate
        : undefined

    if (start && end && start > end) {
      return { success: false, error: 'Start date must be before end date' }
    }

    const data = await getStageDelayReport(start, end)

    logger.info('Stage delay report fetched', {
      stages: data.rows.length,
      bottlenecks: data.rows.filter((r) => r.isBottleneck).length,
    })

    return { success: true, data }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch stage delay data'
    logger.error('fetchStageDelayReport failed', error as Error)
    return { success: false, error: message }
  }
}
