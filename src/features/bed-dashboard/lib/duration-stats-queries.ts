// Stage Duration Statistics Queries
// Purpose: Analyze duration statistics for each stage
// Epic: EPIC 3 - Time Tracking & Stage Logging

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { StageDurationStats } from './stage-analytics'

// pg returns COUNT as string — raw row before coercion
interface RawStageDurationStats {
  stageName: string
  stageId: string
  totalTransitions: string
  averageDurationMs: string | null
  minDurationMs: string | null
  maxDurationMs: string | null
  medianDurationMs: string | null
  p90DurationMs: string | null
  p95DurationMs: string | null
}

/**
 * Get duration statistics for each stage
 * @param startDate - Filter from this date
 * @param endDate - Filter until this date
 */
export async function getStageDurationStats(
  startDate?: Date,
  endDate?: Date
): Promise<StageDurationStats[]> {
  try {
    let sql = `
      SELECT 
        s.name as "stageName",
        s.id as "stageId",
        COUNT(bsl.id) as "totalTransitions",
        AVG(bsl.duration_in_previous_stage_ms) as "averageDurationMs",
        MIN(bsl.duration_in_previous_stage_ms) as "minDurationMs",
        MAX(bsl.duration_in_previous_stage_ms) as "maxDurationMs",
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY bsl.duration_in_previous_stage_ms) as "medianDurationMs",
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY bsl.duration_in_previous_stage_ms) as "p90DurationMs",
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY bsl.duration_in_previous_stage_ms) as "p95DurationMs"
      FROM stages s
      LEFT JOIN bed_stage_logs bsl ON s.id = bsl.to_stage_id
      WHERE 1=1
    `

    const params: unknown[] = []

    if (startDate) {
      params.push(startDate)
      sql += ` AND bsl.transition_time >= $${params.length}`
    }

    if (endDate) {
      params.push(endDate)
      sql += ` AND bsl.transition_time <= $${params.length}`
    }

    sql += `
      GROUP BY s.id, s.name
      ORDER BY s.display_order ASC
    `

    const result = await query<RawStageDurationStats>(sql, params)
    // Coerce pg string results to numbers
    return result.rows.map((row) => ({
      stageName: row.stageName,
      stageId: row.stageId,
      totalTransitions: parseInt(row.totalTransitions, 10) || 0,
      averageDurationMs: row.averageDurationMs !== null ? parseFloat(row.averageDurationMs) : 0,
      minDurationMs: row.minDurationMs !== null ? parseFloat(row.minDurationMs) : null,
      maxDurationMs: row.maxDurationMs !== null ? parseFloat(row.maxDurationMs) : null,
      medianDurationMs: row.medianDurationMs !== null ? parseFloat(row.medianDurationMs) : null,
      p90DurationMs: row.p90DurationMs !== null ? parseFloat(row.p90DurationMs) : null,
      p95DurationMs: row.p95DurationMs !== null ? parseFloat(row.p95DurationMs) : null,
    }))
  } catch (error) {
    logger.error('Failed to fetch stage duration stats', error as Error)
    throw new Error('Failed to fetch stage duration statistics from database')
  }
}
