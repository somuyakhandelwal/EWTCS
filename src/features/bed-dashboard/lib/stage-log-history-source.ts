// stage-log-history-source.ts
// Unified source for stage transition history across live + archived logs.
// US-8.2: shift_id is included in both branches so callers can join shifts
//         and show / override the shift tag per log entry.

export const STAGE_LOG_HISTORY_CTE = `
WITH stage_logs AS (
  SELECT
    bsl.id,
    bsl.bed_id,
    COALESCE(b.bed_number, 'Unknown') AS bed_number,
    bsl.from_stage_id,
    bsl.to_stage_id,
    fs.name AS from_stage_name,
    ts.name AS to_stage_name,
    bsl.changed_by_user_id,
    COALESCE(u.username, 'Unknown') AS changed_by_username,
    bsl.transition_time,
    bsl.duration_in_previous_stage_ms,
    bsl.notes,
    bsl.shift_id
  FROM bed_stage_logs bsl
  LEFT JOIN beds b ON b.id = bsl.bed_id
  LEFT JOIN stages fs ON fs.id = bsl.from_stage_id
  LEFT JOIN stages ts ON ts.id = bsl.to_stage_id
  LEFT JOIN users u ON u.id = bsl.changed_by_user_id

  UNION ALL

  SELECT
    bsl.id,
    bsl.bed_id,
    COALESCE(b.bed_number, 'Unknown') AS bed_number,
    bsl.from_stage_id,
    bsl.to_stage_id,
    fs.name AS from_stage_name,
    ts.name AS to_stage_name,
    bsl.changed_by_user_id,
    COALESCE(u.username, 'Unknown') AS changed_by_username,
    bsl.transition_time,
    bsl.duration_in_previous_stage_ms,
    bsl.notes,
    bsl.shift_id
  FROM bed_stage_logs_archive bsl
  LEFT JOIN beds b ON b.id = bsl.bed_id
  LEFT JOIN stages fs ON fs.id = bsl.from_stage_id
  LEFT JOIN stages ts ON ts.id = bsl.to_stage_id
  LEFT JOIN users u ON u.id = bsl.changed_by_user_id
)
`
