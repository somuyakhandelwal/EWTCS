import { query } from '@/shared/lib/db'
import type { RawAvgTat } from './aggregation-helpers'

export async function getAvgTat(
  dayStart: Date,
  dayEnd: Date
): Promise<{ avgTatMs: number; avgErTatMs: number | null; avgTriageTatMs: number | null }> {
  const result = await query<RawAvgTat>(WORKFLOW_TAT_SQL, [dayStart, dayEnd])
  const row = result.rows[0]
  return {
    avgTatMs: row?.avgTatMs !== null && row?.avgTatMs !== undefined ? parseFloat(row.avgTatMs) : 0,
    avgErTatMs: row?.avgErTatMs !== null && row?.avgErTatMs !== undefined ? parseFloat(row.avgErTatMs) : null,
    avgTriageTatMs:
      row?.avgTriageTatMs !== null && row?.avgTriageTatMs !== undefined
        ? parseFloat(row.avgTriageTatMs)
        : null,
  }
}

export const WORKFLOW_TAT_SQL = `
    WITH er_start_events AS (
      SELECT bsl.bed_id, bsl.transition_time AS started_at
      FROM bed_stage_logs bsl
      JOIN beds b ON b.id = bsl.bed_id
      JOIN wards w ON w.id = b.ward_id AND w.code = 'ER'
      JOIN stages fs ON fs.id = bsl.from_stage_id
      JOIN stages ts ON ts.id = bsl.to_stage_id
      WHERE LOWER(fs.name) = 'empty'
        AND ts.is_active = true
        AND LOWER(ts.name) NOT IN ('empty', 'cleaning', 'triage')
    ),
    er_cleaning_events AS (
      SELECT
        bsl.bed_id,
        bsl.transition_time AS cleaning_at,
        LAG(bsl.transition_time) OVER (
          PARTITION BY bsl.bed_id ORDER BY bsl.transition_time ASC
        ) AS previous_cleaning_at
      FROM bed_stage_logs bsl
      JOIN beds b ON b.id = bsl.bed_id
      JOIN wards w ON w.id = b.ward_id AND w.code = 'ER'
      JOIN stages ts ON ts.id = bsl.to_stage_id
      WHERE LOWER(ts.name) = 'cleaning'
    ),
    er_cycles AS (
      SELECT EXTRACT(EPOCH FROM (ce.cleaning_at - se.started_at)) * 1000 AS duration_ms
      FROM er_cleaning_events ce
      JOIN LATERAL (
        SELECT s.started_at
        FROM er_start_events s
        WHERE s.bed_id = ce.bed_id
          AND s.started_at < ce.cleaning_at
          AND (ce.previous_cleaning_at IS NULL OR s.started_at > ce.previous_cleaning_at)
        ORDER BY s.started_at DESC
        LIMIT 1
      ) se ON true
      WHERE ce.cleaning_at >= $1 AND ce.cleaning_at <= $2
    ),
    triage_start_events AS (
      SELECT tsl.bed_id, tsl.transition_time AS started_at
      FROM triage_state_logs tsl
      JOIN beds b ON b.id = tsl.bed_id
      JOIN wards w ON w.id = b.ward_id AND w.code = 'TRIAGE'
      WHERE tsl.to_state = 'initial_treatment'
    ),
    triage_cleaning_events AS (
      SELECT
        tsl.bed_id,
        tsl.transition_time AS cleaning_at,
        LAG(tsl.transition_time) OVER (
          PARTITION BY tsl.bed_id ORDER BY tsl.transition_time ASC
        ) AS previous_cleaning_at
      FROM triage_state_logs tsl
      JOIN beds b ON b.id = tsl.bed_id
      JOIN wards w ON w.id = b.ward_id AND w.code = 'TRIAGE'
      WHERE tsl.to_state = 'cleaning'
    ),
    triage_cycles AS (
      SELECT EXTRACT(EPOCH FROM (ce.cleaning_at - se.started_at)) * 1000 AS duration_ms
      FROM triage_cleaning_events ce
      JOIN LATERAL (
        SELECT s.started_at
        FROM triage_start_events s
        WHERE s.bed_id = ce.bed_id
          AND s.started_at < ce.cleaning_at
          AND (ce.previous_cleaning_at IS NULL OR s.started_at > ce.previous_cleaning_at)
        ORDER BY s.started_at DESC
        LIMIT 1
      ) se ON true
      WHERE ce.cleaning_at >= $1 AND ce.cleaning_at <= $2
    ),
    workflow_cycles AS (
      SELECT duration_ms, 'er'::text AS workflow FROM er_cycles
      UNION ALL
      SELECT duration_ms, 'triage'::text AS workflow FROM triage_cycles
    )
    SELECT
      AVG(duration_ms) AS "avgTatMs",
      AVG(duration_ms) FILTER (WHERE workflow = 'er') AS "avgErTatMs",
      AVG(duration_ms) FILTER (WHERE workflow = 'triage') AS "avgTriageTatMs"
    FROM workflow_cycles
  `
