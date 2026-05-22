-- Migration 1775303000001: Restore triage workflow TAT in daily_summaries_mv
-- Purpose: Re-apply the EPIC 25 workflow TAT model after the triage workflow tables exist.

BEGIN;

DROP MATERIALIZED VIEW IF EXISTS daily_summaries_mv;

CREATE MATERIALIZED VIEW daily_summaries_mv AS
WITH bed_stats AS (
  SELECT
    DATE_TRUNC('day', bsl.transition_time)::date AS summary_date,
    COUNT(DISTINCT bsl.bed_id)::int AS total_beds_used,
    COUNT(bsl.id)::int AS total_stage_updates,
    COALESCE(ROUND((AVG(bsl.duration_in_previous_stage_ms)::numeric / 60000), 2), 0)::numeric(10,2)
      AS avg_stage_time_minutes
  FROM bed_stage_logs bsl
  GROUP BY DATE_TRUNC('day', bsl.transition_time)::date
),
patient_stats AS (
  SELECT
    DATE_TRUNC('day', bsl.transition_time)::date AS summary_date,
    COUNT(DISTINCT pa.id)::int AS total_patients
  FROM bed_stage_logs bsl
  LEFT JOIN patient_admissions pa
    ON pa.bed_id = bsl.bed_id
   AND pa.admitted_at >= DATE_TRUNC('day', bsl.transition_time)
   AND pa.admitted_at < DATE_TRUNC('day', bsl.transition_time) + INTERVAL '1 day'
  GROUP BY DATE_TRUNC('day', bsl.transition_time)::date
),
delay_stats AS (
  SELECT
    DATE_TRUNC('day', ddr.recorded_at)::date AS summary_date,
    COUNT(DISTINCT ddr.bed_id)::int AS delay_count
  FROM disposition_delay_reasons ddr
  GROUP BY DATE_TRUNC('day', ddr.recorded_at)::date
),
er_start_events AS (
  SELECT
    bsl.bed_id,
    bsl.transition_time AS started_at
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
    DATE_TRUNC('day', bsl.transition_time)::date AS summary_date,
    LAG(bsl.transition_time) OVER (
      PARTITION BY bsl.bed_id
      ORDER BY bsl.transition_time ASC
    ) AS previous_cleaning_at
  FROM bed_stage_logs bsl
  JOIN beds b ON b.id = bsl.bed_id
  JOIN wards w ON w.id = b.ward_id AND w.code = 'ER'
  JOIN stages ts ON ts.id = bsl.to_stage_id
  WHERE LOWER(ts.name) = 'cleaning'
),
triage_start_events AS (
  SELECT
    tsl.bed_id,
    tsl.transition_time AS started_at
  FROM triage_state_logs tsl
  JOIN beds b ON b.id = tsl.bed_id
  JOIN wards w ON w.id = b.ward_id AND w.code = 'TRIAGE'
  WHERE tsl.to_state = 'initial_treatment'
),
triage_cleaning_events AS (
  SELECT
    tsl.bed_id,
    tsl.transition_time AS cleaning_at,
    DATE_TRUNC('day', tsl.transition_time)::date AS summary_date,
    LAG(tsl.transition_time) OVER (
      PARTITION BY tsl.bed_id
      ORDER BY tsl.transition_time ASC
    ) AS previous_cleaning_at
  FROM triage_state_logs tsl
  JOIN beds b ON b.id = tsl.bed_id
  JOIN wards w ON w.id = b.ward_id AND w.code = 'TRIAGE'
  WHERE tsl.to_state = 'cleaning'
),
workflow_tat_cycles AS (
  SELECT
    ce.summary_date,
    (EXTRACT(EPOCH FROM (ce.cleaning_at - se.started_at)) * 1000)::numeric AS duration_ms
  FROM er_cleaning_events ce
  JOIN LATERAL (
    SELECT s.started_at
    FROM er_start_events s
    WHERE s.bed_id = ce.bed_id
      AND s.started_at < ce.cleaning_at
      AND (
        ce.previous_cleaning_at IS NULL
        OR s.started_at > ce.previous_cleaning_at
      )
    ORDER BY s.started_at DESC
    LIMIT 1
  ) se ON true

  UNION ALL

  SELECT
    ce.summary_date,
    (EXTRACT(EPOCH FROM (ce.cleaning_at - se.started_at)) * 1000)::numeric AS duration_ms
  FROM triage_cleaning_events ce
  JOIN LATERAL (
    SELECT s.started_at
    FROM triage_start_events s
    WHERE s.bed_id = ce.bed_id
      AND s.started_at < ce.cleaning_at
      AND (
        ce.previous_cleaning_at IS NULL
        OR s.started_at > ce.previous_cleaning_at
      )
    ORDER BY s.started_at DESC
    LIMIT 1
  ) se ON true
),
tat_stats AS (
  SELECT
    summary_date,
    COALESCE(ROUND((AVG(duration_ms) / 60000), 2), 0)::numeric(10,2) AS avg_tat_minutes
  FROM workflow_tat_cycles
  GROUP BY summary_date
)
SELECT
  bs.summary_date,
  COALESCE(ps.total_patients, 0)::int AS total_patients,
  bs.avg_stage_time_minutes,
  COALESCE(ds.delay_count, 0)::int AS delay_count,
  COALESCE(ts.avg_tat_minutes, 0)::numeric(10,2) AS avg_tat_minutes,
  bs.total_beds_used,
  bs.total_stage_updates,
  NOW() AS generated_at
FROM bed_stats bs
LEFT JOIN patient_stats ps ON ps.summary_date = bs.summary_date
LEFT JOIN delay_stats ds ON ds.summary_date = bs.summary_date
LEFT JOIN tat_stats ts ON ts.summary_date = bs.summary_date;

CREATE UNIQUE INDEX idx_daily_summaries_mv_summary_date
  ON daily_summaries_mv (summary_date);

COMMIT;

REFRESH MATERIALIZED VIEW daily_summaries_mv;
