// Delayed Patients Queries (US-10.3)
// Epic 10: Management Report Dashboard
//
// A patient is "delayed" when their total stay (total_duration_ms in
// patient_admissions) exceeds the configured threshold.
// Threshold priority: los_target_minutes → delay_threshold_minutes → 180 min.
//
// SERVER-ONLY – imports pg via @/shared/lib/db.
import 'server-only'

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type {
  DelayedPatientsSummary,
  DelayTrendPoint,
} from '../types/report.types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveThresholdMs(): Promise<number> {
  try {
    const result = await query<{ value: string }>(
      `SELECT value FROM system_settings
       WHERE key IN ('los_target_minutes', 'delay_threshold_minutes')
       ORDER BY CASE key WHEN 'los_target_minutes' THEN 0 ELSE 1 END
       LIMIT 1`
    )
    if (result.rows.length === 0) return 180 * 60 * 1000
    const minutes = parseInt(result.rows[0].value, 10)
    return isNaN(minutes) || minutes <= 0 ? 180 * 60 * 1000 : minutes * 60 * 1000
  } catch {
    return 180 * 60 * 1000
  }
}

async function resolveTargetPct(): Promise<number | null> {
  try {
    const result = await query<{ value: string }>(
      `SELECT value FROM system_settings WHERE key = 'delay_target_pct' LIMIT 1`
    )
    if (result.rows.length === 0) return null
    const pct = parseFloat(result.rows[0].value)
    return isNaN(pct) ? null : pct
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Main query
// ---------------------------------------------------------------------------

/**
 * Returns aggregate delayed-patient statistics plus a daily trend.
 *
 * @param startDate  Inclusive range start
 * @param endDate    Inclusive range end
 * @param shiftId    Optional UUID to scope to a single shift
 */
export async function getDelayedPatientsSummary(
  startDate: Date,
  endDate: Date,
  shiftId?: string | null
): Promise<DelayedPatientsSummary> {
  const thresholdMs = await resolveThresholdMs()
  const targetPct = await resolveTargetPct()

  const params: unknown[] = [startDate, endDate, thresholdMs, shiftId ?? null]

  // --- aggregated totals ---
  const summaryResult = await query<{
    total_patients: string
    delayed_patients: string
  }>(
    `SELECT
       COUNT(*)                                              AS total_patients,
       COUNT(*) FILTER (WHERE pa.total_duration_ms > $3)    AS delayed_patients
     FROM patient_admissions pa
     WHERE pa.discharged_at >= $1
       AND pa.discharged_at <= $2
       AND ($4::uuid IS NULL OR pa.shift_id = $4::uuid)`,
    params
  )

  const totalPatients = parseInt(summaryResult.rows[0]?.total_patients ?? '0', 10)
  const delayedPatients = parseInt(summaryResult.rows[0]?.delayed_patients ?? '0', 10)
  const delayPct =
    totalPatients > 0
      ? Math.round((delayedPatients / totalPatients) * 1000) / 10
      : 0

  // --- daily trend ---
  const trendResult = await query<{
    date: string
    total_patients: string
    delayed_patients: string
  }>(
    `SELECT
       DATE(pa.discharged_at)::text                                  AS date,
       COUNT(*)                                                       AS total_patients,
       COUNT(*) FILTER (WHERE pa.total_duration_ms > $3)::text       AS delayed_patients
     FROM patient_admissions pa
     WHERE pa.discharged_at >= $1
       AND pa.discharged_at <= $2
       AND ($4::uuid IS NULL OR pa.shift_id = $4::uuid)
     GROUP BY DATE(pa.discharged_at)
     ORDER BY DATE(pa.discharged_at) ASC`,
    params
  )

  const trend: DelayTrendPoint[] = trendResult.rows.map((row) => {
    const tot = parseInt(row.total_patients, 10)
    const del = parseInt(row.delayed_patients, 10)
    return {
      date: row.date,
      totalPatients: tot,
      delayedPatients: del,
      delayPct: tot > 0 ? Math.round((del / tot) * 1000) / 10 : 0,
    }
  })

  return {
    totalPatients,
    delayedPatients,
    delayPct,
    targetPct,
    thresholdMs,
    rangeStart: startDate,
    rangeEnd: endDate,
    trend,
  }
}

/**
 * Persist the delay target percentage in system_settings.
 */
export async function saveDelayTargetPct(pct: number | null): Promise<void> {
  try {
    if (pct === null) {
      await query(
        `DELETE FROM system_settings WHERE key = 'delay_target_pct'`
      )
    } else {
      await query(
        `INSERT INTO system_settings (key, value, description)
         VALUES ('delay_target_pct', $1, 'Target: max % of patients that may exceed the delay threshold')
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [String(pct)]
      )
    }
  } catch (error) {
    logger.error('saveDelayTargetPct failed', error as Error)
    throw new Error('Failed to save delay target percentage')
  }
}
