// Triage Duration Statistics Queries
// Purpose: Analyze duration statistics for triage workflow states

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { StageDurationStats } from './stage-analytics'
import { withCache, ANALYTICS_CACHE_TAG, ANALYTICS_CACHE_TTL_S } from '@/shared/lib/query-cache'

interface RawTriageDurationStats {
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

const TRIAGE_STATE_DISPLAY_ORDER: Record<string, number> = {
  initial_treatment: 1,
  decision_made: 2,
  cleaning: 3,
}

const TRIAGE_STATE_LABELS: Record<string, string> = {
  initial_treatment: 'Initial Treatment',
  decision_made: 'Decision Made',
  cleaning: 'Cleaning',
}

async function getTriageStateDurationStatsImpl(
  startDate?: Date,
  endDate?: Date
): Promise<StageDurationStats[]> {
  try {
    const params: unknown[] = []
    let filters = `
      AND tsl.duration_in_previous_state_ms IS NOT NULL
      AND tsl.from_state IS NOT NULL
      AND tsl.from_state <> 'empty'
    `

    if (startDate) {
      params.push(startDate)
      filters += ` AND tsl.transition_time >= $${params.length}`
    }

    if (endDate) {
      params.push(endDate)
      filters += ` AND tsl.transition_time <= $${params.length}`
    }

    const sql = `
      SELECT
        tsl.from_state::text AS "stageId",
        COUNT(tsl.id) AS "totalTransitions",
        AVG(tsl.duration_in_previous_state_ms) AS "averageDurationMs",
        MIN(tsl.duration_in_previous_state_ms) AS "minDurationMs",
        MAX(tsl.duration_in_previous_state_ms) AS "maxDurationMs",
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY tsl.duration_in_previous_state_ms) AS "medianDurationMs",
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY tsl.duration_in_previous_state_ms) AS "p90DurationMs",
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY tsl.duration_in_previous_state_ms) AS "p95DurationMs"
      FROM triage_state_logs tsl
      JOIN beds b ON b.id = tsl.bed_id
      JOIN wards w ON w.id = b.ward_id AND w.code = 'TRIAGE'
      WHERE 1 = 1
        ${filters}
      GROUP BY tsl.from_state
    `

    const result = await query<RawTriageDurationStats>(sql, params)
    return result.rows
      .map((row) => ({
        stageName: TRIAGE_STATE_LABELS[row.stageId] ?? row.stageId,
        stageId: row.stageId,
        totalTransitions: parseInt(row.totalTransitions, 10) || 0,
        averageDurationMs: row.averageDurationMs !== null ? parseFloat(row.averageDurationMs) : 0,
        minDurationMs: row.minDurationMs !== null ? parseFloat(row.minDurationMs) : null,
        maxDurationMs: row.maxDurationMs !== null ? parseFloat(row.maxDurationMs) : null,
        medianDurationMs: row.medianDurationMs !== null ? parseFloat(row.medianDurationMs) : null,
        p90DurationMs: row.p90DurationMs !== null ? parseFloat(row.p90DurationMs) : null,
        p95DurationMs: row.p95DurationMs !== null ? parseFloat(row.p95DurationMs) : null,
      }))
      .sort(
        (left, right) =>
          (TRIAGE_STATE_DISPLAY_ORDER[left.stageId] ?? Number.MAX_SAFE_INTEGER) -
          (TRIAGE_STATE_DISPLAY_ORDER[right.stageId] ?? Number.MAX_SAFE_INTEGER)
      )
  } catch (error) {
    logger.error('Failed to fetch triage duration stats', error as Error)
    throw new Error('Failed to fetch triage duration statistics from database')
  }
}

export const getTriageStateDurationStats = withCache(
  getTriageStateDurationStatsImpl,
  'triage-state-duration-stats',
  ANALYTICS_CACHE_TTL_S,
  [ANALYTICS_CACHE_TAG],
)
