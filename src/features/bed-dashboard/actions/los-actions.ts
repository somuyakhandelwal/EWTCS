'use server'
// Length of Stay (LoS) Server Actions
// EPIC 10: Management Report Dashboard
// US-10.x: Average Time Patients Spend in Emergency Ward
//
// Role access: admin, supervisor, auditor (read-only analytics access)

import { requireRole } from '@/shared/lib/auth'
import { logger } from '@/shared/config/logger'
import {
  getLosSummary,
  getLosTrend,
  getLosTargetMs,
  type LosFilters,
  type LosSummary,
  type LosTrendPoint,
} from '../lib/los-queries'
import { query } from '@/shared/lib/db'

// ---------------------------------------------------------------------------
// Return types
// ---------------------------------------------------------------------------

export interface FetchLosSummaryResult {
  success: boolean
  data?: LosSummary
  error?: string
}

export interface FetchLosTrendResult {
  success: boolean
  data?: LosTrendPoint[]
  error?: string
}

export interface FetchLosTargetResult {
  success: boolean
  /** Target in minutes (for display in form inputs) */
  targetMinutes?: number | null
  error?: string
}

export interface SaveLosTargetResult {
  success: boolean
  error?: string
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Fetch aggregate LoS statistics with optional date/shift filters.
 * Accessible by admin, supervisor, and auditor.
 */
export async function fetchLosSummary(
  filters: LosFilters = {}
): Promise<FetchLosSummaryResult> {
  try {
    await requireRole(['admin', 'supervisor', 'auditor'])

    const data = await getLosSummary(filters)

    logger.info('LoS summary fetched', {
      totalPatients: data.totalPatients,
      averageLosMs: data.averageLosMs,
    })

    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch LoS summary'
    logger.error('fetchLosSummary failed', error as Error)
    return { success: false, error: message }
  }
}

/**
 * Fetch daily LoS trend data for the trend chart.
 * Accessible by admin, supervisor, and auditor.
 */
export async function fetchLosTrend(
  filters: LosFilters = {}
): Promise<FetchLosTrendResult> {
  try {
    await requireRole(['admin', 'supervisor', 'auditor'])

    const data = await getLosTrend(filters)

    logger.info('LoS trend fetched', { dataPoints: data.length })

    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch LoS trend'
    logger.error('fetchLosTrend failed', error as Error)
    return { success: false, error: message }
  }
}

/**
 * Fetch the configured LoS target (in minutes) from system_settings.
 * Returns null if not yet configured.
 */
export async function fetchLosTarget(): Promise<FetchLosTargetResult> {
  try {
    await requireRole(['admin', 'supervisor', 'auditor'])

    const targetMs = await getLosTargetMs()
    const targetMinutes = targetMs !== null ? targetMs / 60000 : null

    return { success: true, targetMinutes }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch LoS target'
    logger.error('fetchLosTarget failed', error as Error)
    return { success: false, error: message }
  }
}

/**
 * Save (upsert) the LoS target in minutes to system_settings.
 * Admin only — supervisors and auditors cannot modify configuration.
 *
 * @param targetMinutes - Target in minutes (must be > 0), or null to clear
 */
export async function saveLosTarget(
  targetMinutes: number | null
): Promise<SaveLosTargetResult> {
  try {
    await requireRole('admin')

    if (targetMinutes !== null && (targetMinutes <= 0 || !isFinite(targetMinutes))) {
      return { success: false, error: 'Target must be a positive number of minutes' }
    }

    if (targetMinutes === null) {
      // Remove the target setting
      await query(`DELETE FROM system_settings WHERE key = 'los_target_minutes'`)
      logger.info('LoS target cleared')
    } else {
      // Upsert — insert or update
      await query(
        `INSERT INTO system_settings (key, value, description)
         VALUES ('los_target_minutes', $1, 'Target average length of stay in minutes (EPIC 10)')
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [String(targetMinutes)]
      )
      logger.info('LoS target saved', { targetMinutes })
    }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save LoS target'
    logger.error('saveLosTarget failed', error as Error)
    return { success: false, error: message }
  }
}
