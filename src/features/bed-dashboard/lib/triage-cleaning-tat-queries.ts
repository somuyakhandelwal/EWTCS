import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { DurationMetricSummary, WorkflowTatRecord } from './stage-analytics'
import {
  appendDateFilters,
  parseDurationSummary,
  type RawDurationMetricSummary,
} from './workflow-tat-summary'

function buildTriageCleaningSql(includeSummary: boolean): string {
  const selectClause = includeSummary
    ? `
      SELECT
        COUNT(*) AS "totalCycles",
        COALESCE(AVG(tsl.duration_in_previous_state_ms), 0) AS "averageDurationMs",
        MIN(tsl.duration_in_previous_state_ms) AS "minDurationMs",
        MAX(tsl.duration_in_previous_state_ms) AS "maxDurationMs",
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY tsl.duration_in_previous_state_ms) AS "medianDurationMs",
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY tsl.duration_in_previous_state_ms) AS "p90DurationMs"
    `
    : `
      SELECT
        tsl.bed_id AS "bedId",
        b.bed_number AS "bedNumber",
        tsl.transition_time - (tsl.duration_in_previous_state_ms * interval '1 millisecond') AS "startedAt",
        tsl.transition_time AS "completedAt",
        tsl.duration_in_previous_state_ms AS "durationMs"
    `

  return `
    ${selectClause}
    FROM triage_state_logs tsl
    JOIN beds b ON b.id = tsl.bed_id
    JOIN wards w ON w.id = b.ward_id AND w.code = 'TRIAGE'
    WHERE tsl.from_state = 'cleaning'
      AND tsl.to_state = 'empty'
      AND tsl.duration_in_previous_state_ms IS NOT NULL
      AND tsl.duration_in_previous_state_ms > 0
  `
}

export async function getTriageCleaningTatRecords(
  startDate?: Date,
  endDate?: Date
): Promise<WorkflowTatRecord[]> {
  try {
    const params: unknown[] = []
    let sql = buildTriageCleaningSql(false)
    sql = appendDateFilters(sql, params, 'tsl.transition_time', startDate, endDate)
    sql += ' ORDER BY "completedAt" DESC'

    const result = await query<WorkflowTatRecord>(sql, params)
    return result.rows
  } catch (error) {
    logger.error('Failed to fetch triage cleaning TAT records', error as Error)
    throw new Error('Failed to fetch triage cleaning TAT records')
  }
}

export async function getTriageCleaningTatSummary(
  startDate?: Date,
  endDate?: Date
): Promise<DurationMetricSummary> {
  try {
    const params: unknown[] = []
    const sql = appendDateFilters(
      buildTriageCleaningSql(true),
      params,
      'tsl.transition_time',
      startDate,
      endDate
    )
    const result = await query<RawDurationMetricSummary>(sql, params)
    return parseDurationSummary(result.rows[0])
  } catch (error) {
    logger.error('Failed to fetch triage cleaning TAT summary', error as Error)
    throw new Error('Failed to fetch triage cleaning TAT summary')
  }
}
