'use server'
// Shift Analytics Server Actions (US-8.3, US-8.4)
// Epic 8: Shift Management

import { requireRole } from '@/shared/lib/auth'
import { logger } from '@/shared/config/logger'
import {
  getShiftReport,
  getAllShiftsComparison,
} from '../lib/shift-analytics-queries'
import type {
  ShiftPerformanceRow,
  ShiftComparisonReport,
} from '@/features/management-report/types/report.types'

// ---------------------------------------------------------------------------
// Shared date-parsing helper
// ---------------------------------------------------------------------------
function parseDates(
  start: Date | string,
  end: Date | string
): { startDate: Date; endDate: Date } | { error: string } {
  const startDate = typeof start === 'string' ? new Date(start) : start
  const endDate = typeof end === 'string' ? new Date(end) : end
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { error: 'Invalid date range' }
  }
  if (startDate > endDate) {
    return { error: 'Start date must be before end date' }
  }
  return { startDate, endDate }
}

// ---------------------------------------------------------------------------
// US-8.3: Single-shift performance report
// ---------------------------------------------------------------------------
export interface FetchShiftReportResult {
  success: boolean
  data?: ShiftPerformanceRow
  error?: string
}

/**
 * Fetch the performance report for one shift over a date range.
 * Accessible by supervisor, admin, auditor.
 */
export async function fetchShiftReport(params: {
  shiftId: string
  startDate: Date | string
  endDate: Date | string
}): Promise<FetchShiftReportResult> {
  try {
    await requireRole(['supervisor', 'admin', 'auditor'])

    const parsed = parseDates(params.startDate, params.endDate)
    if ('error' in parsed) return { success: false, error: parsed.error }
    const { startDate, endDate } = parsed

    const row = await getShiftReport(params.shiftId, startDate, endDate)
    if (!row) {
      return { success: false, error: 'Shift not found' }
    }

    logger.info('Shift report fetched', {
      shiftId: params.shiftId,
      patients: row.patientsTreated,
    })
    return { success: true, data: row }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch shift report'
    logger.error('fetchShiftReport failed', error as Error)
    return { success: false, error: message }
  }
}

// ---------------------------------------------------------------------------
// US-8.4: All-shifts comparison
// ---------------------------------------------------------------------------
export interface FetchShiftComparisonResult {
  success: boolean
  data?: ShiftComparisonReport
  error?: string
}

/**
 * Fetch performance data for ALL active shifts in the given date range for
 * the side-by-side comparison table (US-8.4).
 */
export async function fetchShiftComparison(params: {
  startDate: Date | string
  endDate: Date | string
}): Promise<FetchShiftComparisonResult> {
  try {
    await requireRole(['supervisor', 'admin', 'auditor'])

    const parsed = parseDates(params.startDate, params.endDate)
    if ('error' in parsed) return { success: false, error: parsed.error }
    const { startDate, endDate } = parsed

    const report = await getAllShiftsComparison(startDate, endDate)

    logger.info('Shift comparison fetched', {
      shifts: report.rows.length,
      bestShiftId: report.bestShiftId,
    })
    return { success: true, data: report }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch shift comparison'
    logger.error('fetchShiftComparison failed', error as Error)
    return { success: false, error: message }
  }
}
