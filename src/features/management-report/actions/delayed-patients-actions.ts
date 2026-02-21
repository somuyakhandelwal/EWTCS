'use server'
// Delayed Patients Server Actions (US-10.3)
// Epic 10: Management Report Dashboard
//
// Accessible by supervisor, admin, and auditor (read-only).

import { requireRole } from '@/shared/lib/auth'
import { logger } from '@/shared/config/logger'
import {
  getDelayedPatientsSummary,
  saveDelayTargetPct,
} from '../lib/delayed-patients-queries'
import type { DelayedPatientsSummary } from '../types/report.types'

export interface FetchDelayedPatientsResult {
  success: boolean
  data?: DelayedPatientsSummary
  error?: string
}

export interface SaveDelayTargetPctResult {
  success: boolean
  error?: string
}

/**
 * Fetch delayed-patient percentage summary for the given date range.
 */
export async function fetchDelayedPatientsSummary(params: {
  startDate: Date | string
  endDate: Date | string
  shiftId?: string | null
}): Promise<FetchDelayedPatientsResult> {
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

    const data = await getDelayedPatientsSummary(
      start,
      end,
      params.shiftId ?? null
    )

    logger.info('Delayed patients summary fetched', {
      total: data.totalPatients,
      delayed: data.delayedPatients,
      pct: data.delayPct,
      shiftId: params.shiftId ?? 'all',
    })

    return { success: true, data }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch delayed patients data'
    logger.error('fetchDelayedPatientsSummary failed', error as Error)
    return { success: false, error: message }
  }
}

/**
 * Save the target delay percentage threshold (admin only).
 * Pass null to remove the target.
 */
export async function saveDelayTargetPctAction(
  pct: number | null
): Promise<SaveDelayTargetPctResult> {
  try {
    await requireRole(['admin'])

    if (pct !== null && (isNaN(pct) || pct < 0 || pct > 100)) {
      return { success: false, error: 'Target must be between 0 and 100' }
    }

    await saveDelayTargetPct(pct)
    logger.info('Delay target pct saved', { pct })
    return { success: true }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to save target'
    logger.error('saveDelayTargetPctAction failed', error as Error)
    return { success: false, error: message }
  }
}
