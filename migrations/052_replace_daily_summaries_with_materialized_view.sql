-- Migration 052: Replace daily_summaries table with daily_summaries_mv materialized view
-- EPIC-DB2 / DB2-01
--
-- Computed metrics move to a materialized view sourced from operational tables.
-- Human-authored workflow fields move to daily_summary_reviews.

BEGIN;

CREATE TABLE IF NOT EXISTS daily_summary_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_date DATE NOT NULL UNIQUE,
  ai_summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'rejected')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  ai_insights JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_summary_reviews_status
  ON daily_summary_reviews (status)
  WHERE status = 'draft';

INSERT INTO daily_summary_reviews (
  summary_date,
  ai_summary,
  metadata,
  status,
  reviewed_by,
  reviewed_at,
  published_at,
  ai_insights,
  created_at,
  updated_at
)
SELECT
  ds.summary_date,
  ds.ai_summary,
  COALESCE(ds.metadata, '{}'::jsonb),
  COALESCE(ds.status, 'draft'),
  ds.reviewed_by,
  ds.reviewed_at,
  ds.published_at,
  COALESCE(ds.ai_insights, '[]'::jsonb),
  COALESCE(ds.generated_at, NOW()),
  NOW()
FROM daily_summaries ds
ON CONFLICT (summary_date) DO UPDATE SET
  ai_summary = EXCLUDED.ai_summary,
  metadata = EXCLUDED.metadata,
  status = EXCLUDED.status,
  reviewed_by = EXCLUDED.reviewed_by,
  reviewed_at = EXCLUDED.reviewed_at,
  published_at = EXCLUDED.published_at,
  ai_insights = EXCLUDED.ai_insights,
  updated_at = NOW();

DROP TABLE IF EXISTS daily_summaries;

DROP MATERIALIZED VIEW IF EXISTS daily_summaries_mv;

CREATE MATERIALIZED VIEW daily_summaries_mv AS
WITH bed_stats AS (
  SELECT
    DATE_TRUNC('day', bsl.transition_time)::date AS summary_date,
    COUNT(DISTINCT bsl.bed_id)::int AS total_beds_used,
    COUNT(bsl.id)::int AS total_stage_updates,
    COALESCE(ROUND((AVG(bsl.duration_in_previous_stage_ms)::numeric / 60000), 2), 0)::numeric(10,2) AS avg_stage_time_minutes
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
tat_stats AS (
  SELECT
    DATE_TRUNC('day', pa.admitted_at)::date AS summary_date,
    COALESCE(ROUND((AVG(pa.tat_from_previous_discharge_ms)::numeric / 60000), 2), 0)::numeric(10,2) AS avg_tat_minutes
  FROM patient_admissions pa
  WHERE pa.tat_from_previous_discharge_ms IS NOT NULL
  GROUP BY DATE_TRUNC('day', pa.admitted_at)::date
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
