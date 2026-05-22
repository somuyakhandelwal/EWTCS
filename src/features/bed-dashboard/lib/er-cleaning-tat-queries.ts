import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { DurationMetricSummary, WorkflowTatRecord } from './stage-analytics'
import { STAGE_LOG_HISTORY_CTE } from './stage-log-history-source'
import {
  appendDateFilters,
  parseDurationSummary,
  type RawDurationMetricSummary,
} from './workflow-tat-summary'

function buildErCleaningSql(includeSummary: boolean): string {
  const selectClause = includeSummary
    ? `
      SELECT
        COUNT(*) AS "totalCycles",
        COALESCE(AVG(sl.duration_in_previous_stage_ms), 0) AS "averageDurationMs",
        MIN(sl.duration_in_previous_stage_ms) AS "minDurationMs",
        MAX(sl.duration_in_previous_stage_ms) AS "maxDurationMs",
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sl.duration_in_previous_stage_ms) AS "medianDurationMs",
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY sl.duration_in_previous_stage_ms) AS "p90DurationMs"
    `
    : `
      SELECT
        sl.bed_id AS "bedId",
        b.bed_number AS "bedNumber",
        sl.transition_time - (sl.duration_in_previous_stage_ms * interval '1 millisecond') AS "startedAt",
        sl.transition_time AS "completedAt",
        sl.duration_in_previous_stage_ms AS "durationMs"
    `

  return `
    ${STAGE_LOG_HISTORY_CTE}
    ${selectClause}
    FROM stage_logs sl
    JOIN beds b ON b.id = sl.bed_id
    JOIN wards w ON w.id = b.ward_id AND w.code = 'ER'
    WHERE LOWER(sl.from_stage_name) = 'cleaning'
      AND LOWER(sl.to_stage_name) = 'empty'
      AND sl.duration_in_previous_stage_ms IS NOT NULL
      AND sl.duration_in_previous_stage_ms > 0
  `
}

export async function getErCleaningTatRecords(
  startDate?: Date,
  endDate?: Date
): Promise<WorkflowTatRecord[]> {
  try {
    const params: unknown[] = []
    let sql = buildErCleaningSql(false)
    sql = appendDateFilters(sql, params, 'sl.transition_time', startDate, endDate)
    sql += ' ORDER BY "completedAt" DESC'

    const result = await query<WorkflowTatRecord>(sql, params)
    return result.rows
  } catch (error) {
    logger.error('Failed to fetch ER cleaning TAT records', error as Error)
    throw new Error('Failed to fetch ER cleaning TAT records')
  }
}

export async function getErCleaningTatSummary(
  startDate?: Date,
  endDate?: Date
): Promise<DurationMetricSummary> {
  try {
    const params: unknown[] = []
    const sql = appendDateFilters(buildErCleaningSql(true), params, 'sl.transition_time', startDate, endDate)
    const result = await query<RawDurationMetricSummary>(sql, params)
    return parseDurationSummary(result.rows[0])
  } catch (error) {
    logger.error('Failed to fetch ER cleaning TAT summary', error as Error)
    throw new Error('Failed to fetch ER cleaning TAT summary')
  }
}
