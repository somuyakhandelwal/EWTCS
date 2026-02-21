'use server'
// Bed-Wise Performance Server Actions (US-10.4)
// Epic 10: Management Report Dashboard
//
// Accessible by supervisor, admin, and auditor (read-only).

import { requireRole } from '@/shared/lib/auth'
import { logger } from '@/shared/config/logger'
import { getBedPerformanceReport } from '../lib/bed-performance-queries'
import type { BedPerformanceReport } from '../types/report.types'

export interface FetchBedPerformanceResult {
  success: boolean
  data?: BedPerformanceReport
  error?: string
}

/**
 * Fetch per-bed performance metrics for the given date range.
 */
export async function fetchBedPerformanceReport(params: {
  startDate: Date | string
  endDate: Date | string
  shiftId?: string | null
}): Promise<FetchBedPerformanceResult> {
  try {
    await requireRole(['supervisor', 'admin', 'auditor'])

    const start =
      typeof params.startDate === 'string'
        ? new Date(params.startDate)
        : params.startDate
    const end =
      typeof params.endDate === 'string'
        ? new Date(params.endDate)
        : params.endDate

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { success: false, error: 'Invalid date range' }
    }
    if (start > end) {
      return { success: false, error: 'Start date must be before end date' }
    }

    const data = await getBedPerformanceReport(
      start,
      end,
      params.shiftId ?? null
    )

    logger.info('Bed performance report fetched', {
      beds: data.rows.length,
      outliers: data.rows.filter((r) => r.isOutlier).length,
      shiftId: params.shiftId ?? 'all',
    })

    return { success: true, data }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch bed performance data'
    logger.error('fetchBedPerformanceReport failed', error as Error)
    return { success: false, error: message }
  }
}
