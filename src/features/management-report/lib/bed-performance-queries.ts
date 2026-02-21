// Bed-Wise Performance Queries (US-10.4)
// Epic 10: Management Report Dashboard
//
// Aggregates patient_admissions per bed to reveal which beds have the most
// patients, longest average stays, and highest delay rates.
//
// SERVER-ONLY – imports pg via @/shared/lib/db.
import 'server-only'

import { query } from '@/shared/lib/db'
import type { BedPerformanceReport, BedPerformanceRow } from '../types/report.types'

// Outlier = avg duration > overall mean × OUTLIER_MULTIPLIER
// OR delay rate > OUTLIER_DELAY_RATE_PCT
const OUTLIER_MULTIPLIER = 1.5
const OUTLIER_DELAY_RATE_PCT = 30

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

/**
 * Returns per-bed performance metrics for a given date range.
 *
 * @param startDate  Inclusive range start
 * @param endDate    Inclusive range end
 * @param shiftId    Optional UUID to scope to a single shift
 */
export async function getBedPerformanceReport(
  startDate: Date,
  endDate: Date,
  shiftId?: string | null
): Promise<BedPerformanceReport> {
  const thresholdMs = await resolveThresholdMs()

  const params: unknown[] = [startDate, endDate, thresholdMs, shiftId ?? null]

  const result = await query<{
    bed_id: string
    bed_number: string
    patients_treated: string
    avg_duration_ms: string | null
    min_duration_ms: string | null
    max_duration_ms: string | null
    delayed_count: string
  }>(
    `SELECT
       b.id                                                              AS bed_id,
       b.bed_number                                                      AS bed_number,
       COUNT(pa.id)                                                      AS patients_treated,
       AVG(pa.total_duration_ms)                                         AS avg_duration_ms,
       MIN(pa.total_duration_ms)                                         AS min_duration_ms,
       MAX(pa.total_duration_ms)                                         AS max_duration_ms,
       COUNT(pa.id) FILTER (WHERE pa.total_duration_ms > $3)             AS delayed_count
     FROM beds b
     LEFT JOIN patient_admissions pa
       ON pa.bed_id = b.id
       AND pa.discharged_at >= $1
       AND pa.discharged_at <= $2
       AND ($4::uuid IS NULL OR pa.shift_id = $4::uuid)
     WHERE b.is_active = true
     GROUP BY b.id, b.bed_number
     ORDER BY b.bed_number ASC`,
    params
  )

  // Compute overall average (across beds that have data)
  const bedsWithData = result.rows.filter((r) => r.avg_duration_ms !== null)
  const overallAvgMs =
    bedsWithData.length > 0
      ? bedsWithData.reduce((s, r) => s + parseFloat(r.avg_duration_ms!), 0) /
        bedsWithData.length
      : null

  const rows: BedPerformanceRow[] = result.rows.map((row) => {
    const patientsTreated = parseInt(row.patients_treated, 10)
    const avgDurationMs =
      row.avg_duration_ms !== null ? parseFloat(row.avg_duration_ms) : null
    const delayedCount = parseInt(row.delayed_count, 10)
    const delayRate =
      patientsTreated > 0
        ? Math.round((delayedCount / patientsTreated) * 1000) / 10
        : 0

    const isOutlier =
      patientsTreated > 0 &&
      ((avgDurationMs !== null &&
        overallAvgMs !== null &&
        avgDurationMs > overallAvgMs * OUTLIER_MULTIPLIER) ||
        delayRate > OUTLIER_DELAY_RATE_PCT)

    return {
      bedId: row.bed_id,
      bedNumber: row.bed_number,
      patientsTreated,
      avgDurationMs,
      minDurationMs:
        row.min_duration_ms !== null ? parseFloat(row.min_duration_ms) : null,
      maxDurationMs:
        row.max_duration_ms !== null ? parseFloat(row.max_duration_ms) : null,
      delayedCount,
      delayRate,
      isOutlier,
    }
  })

  return { rows, overallAvgMs, thresholdMs, rangeStart: startDate, rangeEnd: endDate }
}
