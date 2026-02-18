// Stage Duration Statistics Queries
// Purpose: Analyze duration statistics for each stage
// Epic: EPIC 3 - Time Tracking & Stage Logging

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { StageDurationStats } from './stage-analytics'

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

    const result = await query<StageDurationStats>(sql, params)
    return result.rows
  } catch (error) {
    logger.error('Failed to fetch stage duration stats', error as Error)
    throw new Error('Failed to fetch stage duration statistics from database')
  }
}
