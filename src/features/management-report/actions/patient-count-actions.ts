'use server'
// Patient Count Server Actions (US-10.1)
// Epic 10: Management Report Dashboard
//
// Accessible by supervisor, admin, and auditor roles (read-only for auditor).

import { requireRole } from '@/shared/lib/auth'
import { logger } from '@/shared/config/logger'
import { getPatientCountSummary } from '../lib/patient-count-queries'
import type { PatientCountSummary } from '../types/report.types'

export interface FetchPatientCountResult {
  success: boolean
  data?: PatientCountSummary
  error?: string
}

/**
 * Fetch aggregate patient count stats for the given date range.
 *
 * @param startDate  - Inclusive range start (ISO string or Date)
 * @param endDate    - Inclusive range end   (ISO string or Date)
 * @param shiftId    - Optional UUID to filter by shift (US-10.1 AC)
 */
export async function fetchPatientCountSummary(params: {
  startDate: Date | string
  endDate: Date | string
  shiftId?: string | null
}): Promise<FetchPatientCountResult> {
  try {
    await requireRole(['supervisor', 'admin', 'auditor'])

    const start = typeof params.startDate === 'string'
      ? new Date(params.startDate)
      : params.startDate
    const end = typeof params.endDate === 'string'
      ? new Date(params.endDate)
      : params.endDate

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { success: false, error: 'Invalid date range' }
    }
    if (start > end) {
      return { success: false, error: 'Start date must be before end date' }
    }

    const summary = await getPatientCountSummary(
      start,
      end,
      params.shiftId ?? null
    )

    logger.info('Patient count summary fetched', {
      total: summary.totalPatients,
      shiftId: params.shiftId ?? 'all',
    })

    return { success: true, data: summary }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch patient count'
    logger.error('fetchPatientCountSummary failed', error as Error)
    return { success: false, error: message }
  }
}
