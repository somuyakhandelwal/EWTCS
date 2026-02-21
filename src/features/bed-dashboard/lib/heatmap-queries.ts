// Staffing Heatmap Database Queries
// EPIC 10: Management Report Dashboard
// Queries patient_admissions to produce a day-of-week × hour-of-day volume matrix.

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { HeatmapCell, HeatmapDrillDownRecord } from '../types/heatmap.types'

interface RawHeatmapRow {
  day_of_week: string
  hour_of_day: string
  patient_count: string
}

/**
 * Returns patient admission counts bucketed by day-of-week and hour-of-day.
 * Only non-zero cells are returned (sparse representation).
 *
 * @param startDate - Optional lower bound on admitted_at
 * @param endDate   - Optional upper bound on admitted_at
 */
export async function getHeatmapData(
  startDate?: Date,
  endDate?: Date
): Promise<HeatmapCell[]> {
  try {
    const params: unknown[] = []
    const conditions: string[] = []

    if (startDate) {
      params.push(startDate)
      conditions.push(`admitted_at >= $${params.length}`)
    }
    if (endDate) {
      params.push(endDate)
      conditions.push(`admitted_at <= $${params.length}`)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await query<RawHeatmapRow>(
      `
      SELECT
        EXTRACT(DOW FROM admitted_at)::int::text  AS day_of_week,
        EXTRACT(HOUR FROM admitted_at)::int::text AS hour_of_day,
        COUNT(*)::text                            AS patient_count
      FROM patient_admissions
      ${where}
      GROUP BY day_of_week, hour_of_day
      ORDER BY day_of_week, hour_of_day
      `,
      params
    )

    return result.rows.map(row => ({
      dayOfWeek: parseInt(row.day_of_week, 10),
      hourOfDay: parseInt(row.hour_of_day, 10),
      count:     parseInt(row.patient_count, 10),
    }))
  } catch (error) {
    logger.error('Failed to fetch heatmap data', error as Error)
    throw new Error('Failed to fetch staffing heatmap data from database')
  }
}

interface RawDrillDownRow {
  admissionId: string
  bedNumber: string
  admittedAt: Date
  dischargedAt: Date
  totalDurationMs: string
  dischargedBy: string | null  // LEFT JOIN → null if user row was deleted
}

/**
 * Returns up to 50 individual admission records for a specific DOW + hour cell.
 * Used by the drill-down modal.
 */
export async function getHeatmapCellDetail(
  dayOfWeek: number,
  hourOfDay: number,
  startDate?: Date,
  endDate?: Date
): Promise<HeatmapDrillDownRecord[]> {
  try {
    const params: unknown[] = [dayOfWeek, hourOfDay]
    const conditions: string[] = []

    if (startDate) {
      params.push(startDate)
      conditions.push(`pa.admitted_at >= $${params.length}`)
    }
    if (endDate) {
      params.push(endDate)
      conditions.push(`pa.admitted_at <= $${params.length}`)
    }

    const extraWhere = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : ''

    const result = await query<RawDrillDownRow>(
      `
      SELECT
        pa.id            AS "admissionId",
        b.bed_number     AS "bedNumber",
        pa.admitted_at   AS "admittedAt",
        pa.discharged_at AS "dischargedAt",
        pa.total_duration_ms::text AS "totalDurationMs",
        u.username       AS "dischargedBy"
      -- Bug fix: use LEFT JOIN so drill-down rows are never silently dropped
      -- if the discharging user's account is later hard-deleted from the DB.
      FROM patient_admissions pa
      JOIN beds  b ON pa.bed_id                    = b.id
      LEFT JOIN users u ON pa.discharged_by_user_id = u.id
      WHERE EXTRACT(DOW  FROM pa.admitted_at)::int = $1
        AND EXTRACT(HOUR FROM pa.admitted_at)::int = $2
        ${extraWhere}
      ORDER BY pa.admitted_at DESC
      LIMIT 50
      `,
      params
    )

    return result.rows.map(row => ({
      admissionId:     row.admissionId,
      bedNumber:       row.bedNumber,
      admittedAt:      new Date(row.admittedAt),
      dischargedAt:    new Date(row.dischargedAt),
      totalDurationMs: parseInt(row.totalDurationMs, 10),
      dischargedBy:    row.dischargedBy ?? 'Unknown',  // LEFT JOIN → null-safe
    }))
  } catch (error) {
    logger.error('Failed to fetch heatmap cell detail', error as Error)
    throw new Error('Failed to fetch heatmap cell detail from database')
  }
}
