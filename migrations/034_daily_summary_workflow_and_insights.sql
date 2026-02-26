-- Migration 034: Daily summary workflow (US-9.2) and insights with confidence (US-9.3)
-- Epic 9: Daily AI Summary Generator
--
-- Adds: status (draft|published|rejected), review audit fields, ai_insights JSONB.
-- Existing rows get status='draft' via DEFAULT.

BEGIN;

ALTER TABLE daily_summaries
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'rejected'));

ALTER TABLE daily_summaries
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);

ALTER TABLE daily_summaries
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE daily_summaries
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

ALTER TABLE daily_summaries
  ADD COLUMN IF NOT EXISTS ai_insights JSONB NOT NULL DEFAULT '[]'::JSONB;

CREATE INDEX IF NOT EXISTS idx_daily_summaries_status
  ON daily_summaries (status) WHERE status = 'draft';

COMMIT;

-- Down Migration (for reference; node-pg-migrate may use separate down file)
-- ALTER TABLE daily_summaries DROP INDEX IF EXISTS idx_daily_summaries_status;
-- ALTER TABLE daily_summaries DROP COLUMN IF EXISTS ai_insights;
-- ALTER TABLE daily_summaries DROP COLUMN IF EXISTS published_at;
-- ALTER TABLE daily_summaries DROP COLUMN IF EXISTS reviewed_at;
-- ALTER TABLE daily_summaries DROP COLUMN IF EXISTS reviewed_by;
-- ALTER TABLE daily_summaries DROP COLUMN IF EXISTS status;
