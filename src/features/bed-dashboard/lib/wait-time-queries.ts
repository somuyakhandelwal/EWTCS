// Bed Wait Time Queries
// Purpose: Analyze waiting times and analytic summaries
// Epic: EPIC 3 - Time Tracking & Stage Logging
// EPIC 13: getBedAnalyticsSummary wrapped with 60 s cache (expensive aggregate).

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import { withCache, ANALYTICS_CACHE_TAG, ANALYTICS_CACHE_TTL_S } from '@/shared/lib/query-cache'

/**
 * Get beds with longest wait times in current stage
 * @param limit - Number of results to return
 */
export async function getBedsSortedByCurrentWaitTime(limit: number = 10): Promise<
  Array<{
    bedNumber: string
    bedId: string
    currentStageName: string
    currentStageId: string
    waitTimeMs: number
    transitionTime: Date
  }>
> {
  try {
    const result = await query<{
      bedNumber: string
      bedId: string
      currentStageName: string
      currentStageId: string
      waitTimeMs: number
      transitionTime: Date
    }>(
      // EPIC 13 perf: replaced two correlated subqueries (2×N round-trips) with a
      // single LATERAL join — one aggregation per bed using the new composite index.
      `
      SELECT
        b.bed_number                                                           AS "bedNumber",
        b.id                                                                   AS "bedId",
        s.name                                                                 AS "currentStageName",
        b.current_stage_id                                                     AS "currentStageId",
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_log.last_transition)) * 1000
                                                                               AS "waitTimeMs",
        last_log.last_transition                                               AS "transitionTime"
      FROM beds b
      JOIN wards w ON w.id = b.ward_id AND w.code = 'ER'
      LEFT JOIN stages s         ON b.current_stage_id = s.id
      LEFT JOIN LATERAL (
        SELECT MAX(transition_time) AS last_transition
        FROM   bed_stage_logs
        WHERE  bed_id = b.id
      ) last_log ON true
      WHERE b.is_active = true AND b.is_occupied = true
      ORDER BY "waitTimeMs" DESC
      LIMIT $1
      `,
      [limit]
    )

    return result.rows
  } catch (error) {
    logger.error('Failed to fetch beds sorted by wait time', error as Error)
    throw new Error('Failed to fetch beds sorted by wait time from database')
  }
}

/**
 * Internal implementation. Call the exported `getBedAnalyticsSummary` instead
 * to benefit from the 60 s result cache.
 */
async function getBedAnalyticsSummaryImpl(): Promise<{
  totalBedsUsed: number
  totalTransitions: number
  averageTimePerPatientMs: number
  averageTransitionsPerPatient: number
  totalPatientsProcessed: number
}> {
  try {
    // pg returns COUNT/BIGINT as strings — use a raw type then coerce
    const result = await query<{
      totalBedsUsed: string
      totalTransitions: string
      averageTimePerPatientMs: string | null
      averageTransitionsPerPatient: string | null
      totalPatientsProcessed: string
    }>(
      // EPIC 13 perf: replaced 2×N correlated subqueries with a single CTE that
      // aggregates bed_stage_logs once, then joins — O(N) instead of O(N²).
      `
      WITH bed_stats AS (
        SELECT
          bed_id,
          MAX(transition_time) AS last_transition_time,
          COUNT(*)             AS transition_count
        FROM bed_stage_logs
        GROUP BY bed_id
      )
      SELECT
        COUNT(DISTINCT b.id)::bigint                                                               AS "totalBedsUsed",
        COALESCE(SUM(bs.transition_count), 0)::bigint                                              AS "totalTransitions",
        COALESCE(AVG(
          EXTRACT(EPOCH FROM (
            bs.last_transition_time - COALESCE(b.patient_start_time, CURRENT_TIMESTAMP)
          )) * 1000
        ), 0)                                                                                     AS "averageTimePerPatientMs",
        COALESCE(AVG(bs.transition_count::float), 0)                                               AS "averageTransitionsPerPatient",
        COUNT(DISTINCT CASE WHEN b.patient_start_time IS NOT NULL THEN b.id END)::bigint           AS "totalPatientsProcessed"
      FROM beds b
      JOIN wards w ON w.id = b.ward_id AND w.code = 'ER'
      LEFT JOIN bed_stats bs ON b.id = bs.bed_id
      WHERE b.is_active = true
      `
    )

    const raw = result.rows[0]
    if (!raw) {
      return {
        totalBedsUsed: 0,
        totalTransitions: 0,
        averageTimePerPatientMs: 0,
        averageTransitionsPerPatient: 0,
        totalPatientsProcessed: 0,
      }
    }
    return {
      totalBedsUsed: parseInt(raw.totalBedsUsed, 10) || 0,
      totalTransitions: parseInt(raw.totalTransitions, 10) || 0,
      averageTimePerPatientMs: parseFloat(raw.averageTimePerPatientMs ?? '0') || 0,
      averageTransitionsPerPatient: parseFloat(raw.averageTransitionsPerPatient ?? '0') || 0,
      totalPatientsProcessed: parseInt(raw.totalPatientsProcessed, 10) || 0,
    }
  } catch (error) {
    logger.error('Failed to fetch bed analytics summary', error as Error)
    throw new Error('Failed to fetch bed analytics summary from database')
  }
}

/**
 * Get summary statistics for all beds.
 * EPIC 13: Cached for 60 s — the CTE aggregate across all logs is expensive.
 * Invalidated via `revalidateTag('analytics')` when bed logs are mutated.
 */
export const getBedAnalyticsSummary = withCache(
  getBedAnalyticsSummaryImpl,
  'bed-analytics-summary',
  ANALYTICS_CACHE_TTL_S,
  [ANALYTICS_CACHE_TAG],
)
