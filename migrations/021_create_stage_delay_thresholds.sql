-- Migration 018: Per-stage delay thresholds for US-6.3 (advanced AC-3)
-- Allows individual stages to override the global delay threshold

CREATE TABLE IF NOT EXISTS stage_delay_thresholds (
  stage_id          UUID  PRIMARY KEY REFERENCES stages(id) ON DELETE CASCADE,
  threshold_minutes INT   NOT NULL CHECK (threshold_minutes > 0),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stage_delay_thresholds_stage_id
  ON stage_delay_thresholds(stage_id);

-- Down Migration
-- DROP TABLE IF EXISTS stage_delay_thresholds;
