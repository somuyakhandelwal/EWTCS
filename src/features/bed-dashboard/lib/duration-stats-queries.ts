// Stage Duration Statistics Queries
// Purpose: Analyze duration statistics for ER workflow stages
// Epic: EPIC 3 - Time Tracking & Stage Logging
// EPIC 13: getStageDurationStats wrapped with 60 s cache to cut DB load on the
// analytics page (PERCENTILE_CONT is expensive on large log tables).

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { StageDurationStats } from './stage-analytics'
import { withCache, ANALYTICS_CACHE_TAG, ANALYTICS_CACHE_TTL_S } from '@/shared/lib/query-cache'
import { STAGE_LOG_HISTORY_CTE } from './stage-log-history-source'

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

async function getStageDurationStatsImpl(
  startDate?: Date,
  endDate?: Date
): Promise<StageDurationStats[]> {
  try {
    const params: unknown[] = []
    let filters = `
      AND sl.duration_in_previous_stage_ms IS NOT NULL
      AND LOWER(sl.from_stage_name) <> 'empty'
      AND fs.is_active = true
    `

    if (startDate) {
      params.push(startDate)
      filters += ` AND sl.transition_time >= $${params.length}`
    }

    if (endDate) {
      params.push(endDate)
      filters += ` AND sl.transition_time <= $${params.length}`
    }

    const sql = `
      ${STAGE_LOG_HISTORY_CTE}
      SELECT
        fs.name AS "stageName",
        fs.id AS "stageId",
        COUNT(sl.id) AS "totalTransitions",
        AVG(sl.duration_in_previous_stage_ms) AS "averageDurationMs",
        MIN(sl.duration_in_previous_stage_ms) AS "minDurationMs",
        MAX(sl.duration_in_previous_stage_ms) AS "maxDurationMs",
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sl.duration_in_previous_stage_ms) AS "medianDurationMs",
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY sl.duration_in_previous_stage_ms) AS "p90DurationMs",
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY sl.duration_in_previous_stage_ms) AS "p95DurationMs"
      FROM stage_logs sl
      JOIN beds b ON b.id = sl.bed_id
      JOIN wards w ON w.id = b.ward_id AND w.code = 'ER'
      JOIN stages fs ON fs.id = sl.from_stage_id
      WHERE 1 = 1
        ${filters}
      GROUP BY fs.id, fs.name, fs.display_order
      ORDER BY fs.display_order ASC
    `

    const result = await query<RawStageDurationStats>(sql, params)
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
    logger.error('Failed to fetch ER stage duration stats', error as Error)
    throw new Error('Failed to fetch ER stage duration statistics from database')
  }
}

/**
 * Get duration statistics for each active ER stage.
 * Uses `from_stage_id` because each transition row stores time spent in the
 * previous stage, not the stage being entered.
 */
export const getStageDurationStats = withCache(
  getStageDurationStatsImpl,
  'er-stage-duration-stats',
  ANALYTICS_CACHE_TTL_S,
  [ANALYTICS_CACHE_TAG],
)
