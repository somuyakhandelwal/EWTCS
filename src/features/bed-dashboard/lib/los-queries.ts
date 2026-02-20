// Length of Stay (LoS) Queries
// EPIC 10: Management Report Dashboard
// US-10.x: Average Time Patients Spend in Emergency Ward
//
// Data source: patient_admissions table (migration 013)
// Each row = one completed patient stay with total_duration_ms pre-calculated.

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LosSummary {
  totalPatients: number
  averageLosMs: number
  medianLosMs: number | null
  minLosMs: number | null
  maxLosMs: number | null
  p75LosMs: number | null
  p90LosMs: number | null
  /** Configured target in ms — null if not set */
  targetLosMs: number | null
}

export interface LosTrendPoint {
  /** ISO date string: YYYY-MM-DD */
  date: string
  averageLosMs: number
  patientCount: number
}

export interface LosFilters {
  startDate?: Date
  endDate?: Date
  /** Shift time range: if provided, filter discharges within this HH:MM window */
  shiftStartTime?: string // 'HH:MM'
  shiftEndTime?: string   // 'HH:MM'
  shiftCrossesMidnight?: boolean
}

// Raw pg row before numeric coercion
interface RawLosSummaryRow {
  totalPatients: string
  averageLosMs: string | null
  medianLosMs: string | null
  minLosMs: string | null
  maxLosMs: string | null
  p75LosMs: string | null
  p90LosMs: string | null
}

interface RawLosTrendRow {
  date: string
  averageLosMs: string | null
  patientCount: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the WHERE fragment and params array for date + shift filters.
 * Always starts at param index 1.
 */
function buildWhereClause(filters: LosFilters): {
  whereSql: string
  params: unknown[]
} {
  const clauses: string[] = []
  const params: unknown[] = []

  if (filters.startDate) {
    params.push(filters.startDate)
    clauses.push(`pa.discharged_at >= $${params.length}`)
  }

  if (filters.endDate) {
    params.push(filters.endDate)
    clauses.push(`pa.discharged_at <= $${params.length}`)
  }

  // BUG FIX #6: Shift filtering must compare local hospital time, not UTC.
  // discharged_at is stored as TIMESTAMPTZ. Casting directly to ::timetz extracts
  // the UTC time-of-day which is wrong for local clocks (e.g. IST = UTC+5:30).
  // We AT TIME ZONE 'Asia/Kolkata' first to extract the correct local time-of-day.
  // Change the timezone constant to match your hospital's local timezone.
  if (filters.shiftStartTime && filters.shiftEndTime) {
    const start = filters.shiftStartTime
    const end = filters.shiftEndTime
    const tz = process.env.HOSPITAL_TIMEZONE ?? 'Asia/Kolkata'

    if (!filters.shiftCrossesMidnight) {
      // Normal shift: 08:00 – 16:00
      params.push(start, end, tz)
      clauses.push(
        `(  (pa.discharged_at AT TIME ZONE $${params.length})::time >= $${params.length - 2}::time`
        + ` AND (pa.discharged_at AT TIME ZONE $${params.length})::time < $${params.length - 1}::time)`
      )
    } else {
      // Night shift crosses midnight: 22:00 – 06:00
      params.push(start, end, tz)
      clauses.push(
        `(  (pa.discharged_at AT TIME ZONE $${params.length})::time >= $${params.length - 2}::time`
        + ` OR (pa.discharged_at AT TIME ZONE $${params.length})::time < $${params.length - 1}::time)`
      )
    }
  }

  const whereSql = clauses.length > 0 ? 'WHERE ' + clauses.join(' AND ') : ''
  return { whereSql, params }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch aggregate Length-of-Stay summary statistics.
 * Uses SQL percentile functions for median / p75 / p90.
 *
 * @param filters - Optional date range and shift filters
 */
export async function getLosSummary(filters: LosFilters = {}): Promise<LosSummary> {
  try {
    const { whereSql, params } = buildWhereClause(filters)

    const sql = `
      SELECT
        COUNT(*)::text                                                           AS "totalPatients",
        AVG(pa.total_duration_ms)::text                                         AS "averageLosMs",
        PERCENTILE_CONT(0.5) WITHIN GROUP
          (ORDER BY pa.total_duration_ms)::text                                 AS "medianLosMs",
        MIN(pa.total_duration_ms)::text                                         AS "minLosMs",
        MAX(pa.total_duration_ms)::text                                         AS "maxLosMs",
        PERCENTILE_CONT(0.75) WITHIN GROUP
          (ORDER BY pa.total_duration_ms)::text                                 AS "p75LosMs",
        PERCENTILE_CONT(0.90) WITHIN GROUP
          (ORDER BY pa.total_duration_ms)::text                                 AS "p90LosMs"
      FROM patient_admissions pa
      ${whereSql}
    `

    const result = await query<RawLosSummaryRow>(sql, params)
    const row = result.rows[0]

    // Fetch configured target from system_settings
    const targetMs = await getLosTargetMs()

    return {
      totalPatients: parseInt(row.totalPatients ?? '0', 10) || 0,
      averageLosMs: row.averageLosMs !== null ? parseFloat(row.averageLosMs) : 0,
      medianLosMs: row.medianLosMs !== null ? parseFloat(row.medianLosMs) : null,
      minLosMs: row.minLosMs !== null ? parseFloat(row.minLosMs) : null,
      maxLosMs: row.maxLosMs !== null ? parseFloat(row.maxLosMs) : null,
      p75LosMs: row.p75LosMs !== null ? parseFloat(row.p75LosMs) : null,
      p90LosMs: row.p90LosMs !== null ? parseFloat(row.p90LosMs) : null,
      targetLosMs: targetMs,
    }
  } catch (error) {
    logger.error('getLosSummary failed', error as Error)
    throw new Error('Failed to fetch Length-of-Stay summary')
  }
}

/**
 * Fetch daily trend data: one data point per calendar day.
 * Returns points in ascending date order for chart rendering.
 *
 * @param filters - Optional date range and shift filters
 */
export async function getLosTrend(filters: LosFilters = {}): Promise<LosTrendPoint[]> {
  try {
    const { whereSql, params } = buildWhereClause(filters)

    const sql = `
      SELECT
        DATE(pa.discharged_at)::text     AS "date",
        AVG(pa.total_duration_ms)::text  AS "averageLosMs",
        COUNT(*)::text                   AS "patientCount"
      FROM patient_admissions pa
      ${whereSql}
      GROUP BY DATE(pa.discharged_at)
      ORDER BY DATE(pa.discharged_at) ASC
    `

    const result = await query<RawLosTrendRow>(sql, params)

    return result.rows.map((row) => ({
      date: row.date,
      averageLosMs: row.averageLosMs !== null ? parseFloat(row.averageLosMs) : 0,
      patientCount: parseInt(row.patientCount ?? '0', 10) || 0,
    }))
  } catch (error) {
    logger.error('getLosTrend failed', error as Error)
    throw new Error('Failed to fetch Length-of-Stay trend data')
  }
}

/**
 * Read the configured LoS target from system_settings.
 * Key: 'los_target_minutes'
 * Returns null if not configured (target line is hidden).
 */
export async function getLosTargetMs(): Promise<number | null> {
  try {
    const result = await query<{ value: string }>(
      `SELECT value FROM system_settings WHERE key = 'los_target_minutes' LIMIT 1`
    )
    if (result.rows.length === 0) return null
    const minutes = parseInt(result.rows[0].value, 10)
    return isNaN(minutes) ? null : minutes * 60 * 1000
  } catch (error) {
    logger.error('getLosTargetMs failed', error as Error)
    return null // non-critical — degrade gracefully
  }
}
