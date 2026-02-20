// Length of Stay (LoS) Queries — EPIC 10 / US-10.x
// Data source: patient_admissions (migration 013)

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import { buildLosWhereClause } from './los-where-clause'
import type {
  LosFilters,
  LosSummary,
  LosTrendPoint,
  RawLosSummaryRow,
  RawLosTrendRow,
} from './los-types'

// Re-export types so callers only need to import from this file
export type { LosFilters, LosSummary, LosTrendPoint }

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
    return null
  }
}

export async function getLosSummary(filters: LosFilters = {}): Promise<LosSummary> {
  try {
    const { whereSql, params } = buildLosWhereClause(filters)
    const sql = `
      SELECT
        COUNT(*)::text                                          AS "totalPatients",
        AVG(pa.total_duration_ms)::text                        AS "averageLosMs",
        PERCENTILE_CONT(0.5) WITHIN GROUP
          (ORDER BY pa.total_duration_ms)::text                AS "medianLosMs",
        MIN(pa.total_duration_ms)::text                        AS "minLosMs",
        MAX(pa.total_duration_ms)::text                        AS "maxLosMs",
        PERCENTILE_CONT(0.75) WITHIN GROUP
          (ORDER BY pa.total_duration_ms)::text                AS "p75LosMs",
        PERCENTILE_CONT(0.90) WITHIN GROUP
          (ORDER BY pa.total_duration_ms)::text                AS "p90LosMs"
      FROM patient_admissions pa ${whereSql}`
    const result = await query<RawLosSummaryRow>(sql, params)
    const row = result.rows[0]
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

export async function getLosTrend(filters: LosFilters = {}): Promise<LosTrendPoint[]> {
  try {
    const { whereSql, params } = buildLosWhereClause(filters)
    const sql = `
      SELECT
        DATE(pa.discharged_at)::text     AS "date",
        AVG(pa.total_duration_ms)::text  AS "averageLosMs",
        COUNT(*)::text                   AS "patientCount"
      FROM patient_admissions pa ${whereSql}
      GROUP BY DATE(pa.discharged_at)
      ORDER BY DATE(pa.discharged_at) ASC`
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
