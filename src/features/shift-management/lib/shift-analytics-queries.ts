// Shift Analytics Queries (US-8.3, US-8.4)
// Epic 8: Shift Management / Epic 10: Management Report Dashboard
//
// Per-shift performance aggregates from patient_admissions (stay duration)
// and bed_stage_logs (delay counts). Both tables carry shift_id added in
// migration 019.
//
// SERVER-ONLY.
import 'server-only'

import { query } from '@/shared/lib/db'
import type { ShiftPerformanceRow, ShiftComparisonReport } from '@/features/management-report/types/report.types'

// 3 hours in milliseconds — matches the existing dashboard delay threshold
const DELAY_THRESHOLD_MS = 3 * 60 * 60 * 1000 // 10_800_000

/** Fetch the performance report for a single shift in the given date range. */
export async function getShiftReport(
  shiftId: string,
  startDate: Date,
  endDate: Date
): Promise<ShiftPerformanceRow | null> {
  const result = await query<{
    shift_id: string
    shift_name: string
    start_time: string
    end_time: string
    crosses_midnight: boolean
    patients_treated: string
    avg_tat_ms: string | null
    delay_count: string
  }>(
    `
    SELECT
      s.id                                                     AS shift_id,
      s.name                                                   AS shift_name,
      s.start_time::text                                       AS start_time,
      s.end_time::text                                         AS end_time,
      (s.start_time > s.end_time)                              AS crosses_midnight,
      COUNT(DISTINCT pa.id)                                    AS patients_treated,
      AVG(pa.total_duration_ms)                                AS avg_tat_ms,
      COUNT(CASE
        WHEN bsl.duration_in_previous_stage_ms > $4 THEN 1
      END)                                                     AS delay_count
    FROM shifts s
    LEFT JOIN patient_admissions pa
      ON pa.shift_id = s.id
      AND pa.discharged_at BETWEEN $2 AND $3
    LEFT JOIN bed_stage_logs bsl
      ON bsl.shift_id = s.id
      AND bsl.transition_time BETWEEN $2 AND $3
    WHERE s.id = $1
    GROUP BY s.id, s.name, s.start_time, s.end_time
    `,
    [shiftId, startDate, endDate, DELAY_THRESHOLD_MS]
  )

  if (result.rows.length === 0) return null

  const row = result.rows[0]
  return {
    shiftId: row.shift_id,
    shiftName: row.shift_name,
    startTime: row.start_time,
    endTime: row.end_time,
    crossesMidnight: row.crosses_midnight,
    patientsTreated: parseInt(row.patients_treated, 10),
    avgTatMs: row.avg_tat_ms !== null ? parseFloat(row.avg_tat_ms) : null,
    delayCount: parseInt(row.delay_count, 10),
  }
}

/**
 * Fetch performance rows for ALL active shifts in the given date range.
 * Used by the ShiftComparisonView (US-8.4) to render the side-by-side table.
 *
 * Also computes bestShiftId / worstShiftId:
 *   best  = highest patients_treated; ties broken by lowest delay_count
 *   worst = lowest patients_treated (> 0); ties broken by highest delay_count
 */
export async function getAllShiftsComparison(
  startDate: Date,
  endDate: Date
): Promise<ShiftComparisonReport> {
  const result = await query<{
    shift_id: string
    shift_name: string
    start_time: string
    end_time: string
    crosses_midnight: boolean
    patients_treated: string
    avg_tat_ms: string | null
    delay_count: string
  }>(
    `
    SELECT
      s.id                                                     AS shift_id,
      s.name                                                   AS shift_name,
      s.start_time::text                                       AS start_time,
      s.end_time::text                                         AS end_time,
      (s.start_time > s.end_time)                              AS crosses_midnight,
      COUNT(DISTINCT pa.id)                                    AS patients_treated,
      AVG(pa.total_duration_ms)                                AS avg_tat_ms,
      COUNT(CASE
        WHEN bsl.duration_in_previous_stage_ms > $3 THEN 1
      END)                                                     AS delay_count
    FROM shifts s
    LEFT JOIN patient_admissions pa
      ON pa.shift_id = s.id
      AND pa.discharged_at BETWEEN $1 AND $2
    LEFT JOIN bed_stage_logs bsl
      ON bsl.shift_id = s.id
      AND bsl.transition_time BETWEEN $1 AND $2
    WHERE s.is_active = TRUE
    GROUP BY s.id, s.name, s.start_time, s.end_time
    ORDER BY s.start_time ASC
    `,
    [startDate, endDate, DELAY_THRESHOLD_MS]
  )

  const rows: ShiftPerformanceRow[] = result.rows.map(row => ({
    shiftId: row.shift_id,
    shiftName: row.shift_name,
    startTime: row.start_time,
    endTime: row.end_time,
    crossesMidnight: row.crosses_midnight,
    patientsTreated: parseInt(row.patients_treated, 10),
    avgTatMs: row.avg_tat_ms !== null ? parseFloat(row.avg_tat_ms) : null,
    delayCount: parseInt(row.delay_count, 10),
  }))

  // Compute best / worst only among shifts that have at least 1 patient
  const active = rows.filter(r => r.patientsTreated > 0)

  let bestShiftId: string | null = null
  let worstShiftId: string | null = null

  if (active.length > 0) {
    const sorted = [...active].sort((a, b) => {
      if (b.patientsTreated !== a.patientsTreated) {
        return b.patientsTreated - a.patientsTreated // desc by patients
      }
      return a.delayCount - b.delayCount // asc by delays (fewer = better)
    })
    bestShiftId = sorted[0].shiftId
    worstShiftId = sorted[sorted.length - 1].shiftId
  }

  return { rows, rangeStart: startDate, rangeEnd: endDate, bestShiftId, worstShiftId }
}
