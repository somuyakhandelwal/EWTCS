import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { DurationMetricSummary, WorkflowTatRecord } from './stage-analytics'
import { STAGE_LOG_HISTORY_CTE } from './stage-log-history-source'
import {
  appendDateFilters,
  parseDurationSummary,
  type RawDurationMetricSummary,
} from './workflow-tat-summary'

function buildCompletedErTatCyclesSql(includeSummary: boolean): string {
  const baseSelect = includeSummary
    ? `
      SELECT
        COUNT(*) AS "totalCycles",
        COALESCE(AVG(EXTRACT(EPOCH FROM (c.cleaning_at - s.started_at)) * 1000), 0) AS "averageDurationMs",
        MIN(EXTRACT(EPOCH FROM (c.cleaning_at - s.started_at)) * 1000) AS "minDurationMs",
        MAX(EXTRACT(EPOCH FROM (c.cleaning_at - s.started_at)) * 1000) AS "maxDurationMs",
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (c.cleaning_at - s.started_at)) * 1000) AS "medianDurationMs",
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (c.cleaning_at - s.started_at)) * 1000) AS "p90DurationMs"
    `
    : `
      SELECT
        c.bed_id AS "bedId",
        c.bed_number AS "bedNumber",
        s.started_at AS "startedAt",
        c.cleaning_at AS "completedAt",
        EXTRACT(EPOCH FROM (c.cleaning_at - s.started_at)) * 1000 AS "durationMs"
    `

  return `
    ${STAGE_LOG_HISTORY_CTE},
    er_start_events AS (
      SELECT sl.bed_id, sl.transition_time AS started_at
      FROM stage_logs sl
      JOIN beds b ON b.id = sl.bed_id
      JOIN wards w ON w.id = b.ward_id AND w.code = 'ER'
      JOIN stages ts ON ts.id = sl.to_stage_id
      WHERE LOWER(sl.from_stage_name) = 'empty'
        AND ts.is_active = true
        AND LOWER(sl.to_stage_name) NOT IN ('empty', 'cleaning', 'triage')
    ),
    er_cleaning_events AS (
      SELECT
        sl.bed_id,
        b.bed_number,
        sl.transition_time AS cleaning_at,
        LAG(sl.transition_time) OVER (
          PARTITION BY sl.bed_id ORDER BY sl.transition_time ASC
        ) AS previous_cleaning_at
      FROM stage_logs sl
      JOIN beds b ON b.id = sl.bed_id
      JOIN wards w ON w.id = b.ward_id AND w.code = 'ER'
      WHERE LOWER(sl.to_stage_name) = 'cleaning'
    )
    ${baseSelect}
    FROM er_cleaning_events c
    JOIN LATERAL (
      SELECT se.started_at
      FROM er_start_events se
      WHERE se.bed_id = c.bed_id
        AND se.started_at < c.cleaning_at
        AND (c.previous_cleaning_at IS NULL OR se.started_at > c.previous_cleaning_at)
      ORDER BY se.started_at DESC
      LIMIT 1
    ) s ON true
    WHERE 1 = 1
  `
}

export async function getErTatRecords(
  startDate?: Date,
  endDate?: Date
): Promise<WorkflowTatRecord[]> {
  try {
    const params: unknown[] = []
    let sql = buildCompletedErTatCyclesSql(false)
    sql = appendDateFilters(sql, params, 'c.cleaning_at', startDate, endDate)
    sql += ' ORDER BY c.cleaning_at DESC'

    const result = await query<WorkflowTatRecord>(sql, params)
    return result.rows
  } catch (error) {
    logger.error('Failed to fetch ER TAT records', error as Error)
    throw new Error('Failed to fetch ER TAT records')
  }
}

export async function getErTatSummary(
  startDate?: Date,
  endDate?: Date
): Promise<DurationMetricSummary> {
  try {
    const params: unknown[] = []
    const sql = appendDateFilters(
      buildCompletedErTatCyclesSql(true),
      params,
      'c.cleaning_at',
      startDate,
      endDate
    )
    const result = await query<RawDurationMetricSummary>(sql, params)
    return parseDurationSummary(result.rows[0])
  } catch (error) {
    logger.error('Failed to fetch ER TAT summary', error as Error)
    throw new Error('Failed to fetch ER TAT summary')
  }
}
