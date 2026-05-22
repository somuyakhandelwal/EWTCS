import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { DurationMetricSummary, WorkflowTatRecord } from './stage-analytics'
import {
  appendDateFilters,
  parseDurationSummary,
  type RawDurationMetricSummary,
} from './workflow-tat-summary'

function buildCompletedTriageTatSql(includeSummary: boolean): string {
  const selectClause = includeSummary
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
    WITH triage_start_events AS (
      SELECT tsl.bed_id, tsl.transition_time AS started_at
      FROM triage_state_logs tsl
      JOIN beds b ON b.id = tsl.bed_id
      JOIN wards w ON w.id = b.ward_id AND w.code = 'TRIAGE'
      WHERE tsl.to_state = 'initial_treatment'
    ),
    triage_cleaning_events AS (
      SELECT
        tsl.bed_id,
        b.bed_number,
        tsl.transition_time AS cleaning_at,
        LAG(tsl.transition_time) OVER (
          PARTITION BY tsl.bed_id ORDER BY tsl.transition_time ASC
        ) AS previous_cleaning_at
      FROM triage_state_logs tsl
      JOIN beds b ON b.id = tsl.bed_id
      JOIN wards w ON w.id = b.ward_id AND w.code = 'TRIAGE'
      WHERE tsl.to_state = 'cleaning'
    )
    ${selectClause}
    FROM triage_cleaning_events c
    JOIN LATERAL (
      SELECT se.started_at
      FROM triage_start_events se
      WHERE se.bed_id = c.bed_id
        AND se.started_at < c.cleaning_at
        AND (c.previous_cleaning_at IS NULL OR se.started_at > c.previous_cleaning_at)
      ORDER BY se.started_at DESC
      LIMIT 1
    ) s ON true
    WHERE 1 = 1
  `
}

export async function getTriageTatRecords(
  startDate?: Date,
  endDate?: Date
): Promise<WorkflowTatRecord[]> {
  try {
    const params: unknown[] = []
    let sql = buildCompletedTriageTatSql(false)
    sql = appendDateFilters(sql, params, 'c.cleaning_at', startDate, endDate)
    sql += ' ORDER BY c.cleaning_at DESC'

    const result = await query<WorkflowTatRecord>(sql, params)
    return result.rows
  } catch (error) {
    logger.error('Failed to fetch triage TAT records', error as Error)
    throw new Error('Failed to fetch triage TAT records')
  }
}

export async function getTriageTatSummary(
  startDate?: Date,
  endDate?: Date
): Promise<DurationMetricSummary> {
  try {
    const params: unknown[] = []
    const sql = appendDateFilters(
      buildCompletedTriageTatSql(true),
      params,
      'c.cleaning_at',
      startDate,
      endDate
    )
    const result = await query<RawDurationMetricSummary>(sql, params)
    return parseDurationSummary(result.rows[0])
  } catch (error) {
    logger.error('Failed to fetch triage TAT summary', error as Error)
    throw new Error('Failed to fetch triage TAT summary')
  }
}
