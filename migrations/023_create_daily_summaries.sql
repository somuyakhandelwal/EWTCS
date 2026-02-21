-- Migration 023: Daily summaries table for EPIC 9 (Daily AI Summary Generator)
-- Stores one rolled-up snapshot per calendar day for AI report generation.
-- Aggregation covers: total patients, avg stage time, delay count, avg TAT.
-- Idempotent: ON CONFLICT (summary_date) DO UPDATE ensures safe re-runs.

CREATE TABLE IF NOT EXISTS daily_summaries (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_date          DATE        NOT NULL UNIQUE,
  total_patients        INT         NOT NULL DEFAULT 0,
  avg_stage_time_minutes NUMERIC(10, 2) NOT NULL DEFAULT 0,
  delay_count           INT         NOT NULL DEFAULT 0,
  avg_tat_minutes       NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_beds_used       INT         NOT NULL DEFAULT 0,
  total_stage_updates   INT         NOT NULL DEFAULT 0,
  generated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata              JSONB       NOT NULL DEFAULT '{}'::JSONB
);

-- Index for fast date-range queries (e.g. last 30 days of summaries)
CREATE INDEX IF NOT EXISTS idx_daily_summaries_summary_date
  ON daily_summaries (summary_date DESC);

-- Down Migration
-- DROP TABLE IF EXISTS daily_summaries;
