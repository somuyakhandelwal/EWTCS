-- Daily AI Summaries
-- EPIC 9: Daily AI Summary Generator (US-9.1 through US-9.6)
-- Stores aggregated daily statistics, the AI-generated text, confidence score,
-- review status, supervisor edits, and approval audit trail.

CREATE TYPE summary_status AS ENUM ('draft', 'approved', 'rejected');

CREATE TABLE daily_summaries (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_date         DATE          NOT NULL UNIQUE,

  -- US-9.1: Aggregated statistics snapshot
  total_patients       INT           NOT NULL DEFAULT 0,
  total_transitions    INT           NOT NULL DEFAULT 0,
  avg_tat_ms           BIGINT,
  delayed_transitions  INT           NOT NULL DEFAULT 0,
  delay_rate           NUMERIC(5,4)  NOT NULL DEFAULT 0,   -- 0-1
  beds_used            INT           NOT NULL DEFAULT 0,

  -- US-9.2: AI-generated text (200-300 words)
  ai_text              TEXT,
  -- US-9.4: Confidence score 0-100
  confidence_score     INT           CHECK (confidence_score BETWEEN 0 AND 100),
  ai_model             VARCHAR(100),

  -- US-9.3 / US-9.5: Human-in-the-loop
  status               summary_status NOT NULL DEFAULT 'draft',
  supervisor_notes     TEXT,
  -- Supervisor may edit the AI text before approving
  reviewed_text        TEXT,

  approved_by          UUID          REFERENCES users(id) ON DELETE SET NULL,
  approved_at          TIMESTAMPTZ,
  rejected_by          UUID          REFERENCES users(id) ON DELETE SET NULL,
  rejected_at          TIMESTAMPTZ,
  rejection_reason     TEXT,

  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_daily_summaries_date   ON daily_summaries(summary_date DESC);
CREATE INDEX idx_daily_summaries_status ON daily_summaries(status);

COMMENT ON TABLE daily_summaries IS
  'One row per calendar date — aggregated stats + AI text + approval workflow.';
COMMENT ON COLUMN daily_summaries.delay_rate IS
  'delayed_transitions / total_transitions, pre-computed for display.';
COMMENT ON COLUMN daily_summaries.confidence_score IS
  'Server-computed score 0-100 indicating data completeness and AI reliability.';
