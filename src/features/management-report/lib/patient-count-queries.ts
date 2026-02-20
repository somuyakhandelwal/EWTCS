// Patient Count Queries (US-10.1)
// Epic 10: Management Report Dashboard
//
// Queries the patient_admissions archive table (created in migration 013,
// shift_id column added in migration 019) to count completed patient stays.
//
// SERVER-ONLY: imports pg via @/shared/lib/db. Never import from client code.
import 'server-only'

import { query } from '@/shared/lib/db'
import type { PatientCountSummary } from '../types/report.types'

/**
 * Count discharged patients for a given date range, optionally filtered to
 * a single shift (US-10.1 AC: date range + shift filters).
 *
 * Includes both normally-discharged patients and those marked as transferred
 * (all rows in patient_admissions represent treated patients).
 */
export async function getPatientCountSummary(
  startDate: Date,
  endDate: Date,
  shiftId?: string | null
): Promise<PatientCountSummary> {
  const params: unknown[] = [startDate, endDate]

  // $3 is either a UUID string or NULL — Postgres COALESCE handles the
  // optional filter without a dynamic WHERE clause.
  params.push(shiftId ?? null)

  const sql = `
    SELECT
      COUNT(*)                         AS total_patients,
      AVG(total_duration_ms)           AS avg_duration_ms,
      s.name                           AS shift_name
    FROM patient_admissions pa
    LEFT JOIN shifts s ON s.id = pa.shift_id
    WHERE pa.discharged_at >= $1
      AND pa.discharged_at <= $2
      AND ($3::uuid IS NULL OR pa.shift_id = $3::uuid)
    GROUP BY s.name
  `

  const result = await query<{
    total_patients: string
    avg_duration_ms: string | null
    shift_name: string | null
  }>(sql, params)

  // When filtered by shift there is at most 1 row; when unfiltered there may
  // be multiple rows (one per shift). We aggregate them here.
  if (result.rows.length === 0) {
    return {
      totalPatients: 0,
      avgDurationMs: null,
      rangeStart: startDate,
      rangeEnd: endDate,
      shiftName: shiftId ? null : null,
    }
  }

  // When no shiftId filter: sum across all shifts
  const totalPatients = result.rows.reduce(
    (sum, row) => sum + parseInt(row.total_patients, 10),
    0
  )
  const avgDurationMs =
    result.rows.length === 1 && result.rows[0].avg_duration_ms !== null
      ? parseFloat(result.rows[0].avg_duration_ms)
      : null

  const shiftName = shiftId
    ? (result.rows[0].shift_name ?? null)
    : null

  return {
    totalPatients,
    avgDurationMs,
    rangeStart: startDate,
    rangeEnd: endDate,
    shiftName,
  }
}
