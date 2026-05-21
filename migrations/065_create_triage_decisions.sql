-- Migration 065: Persist triage decision outcomes
-- Purpose: EPIC 25 - record triage disposition and optional ER transfer details.

CREATE TABLE IF NOT EXISTS triage_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  triage_bed_id UUID NOT NULL REFERENCES beds(id) ON DELETE RESTRICT,
  outcome TEXT NOT NULL CHECK (outcome IN ('shift_to_er', 'shift_to_icu_ot', 'discharge')),
  er_bed_id UUID REFERENCES beds(id) ON DELETE RESTRICT,
  er_start_stage_id UUID REFERENCES stages(id) ON DELETE RESTRICT,
  patient_uhid VARCHAR(100),
  patient_ipd_id VARCHAR(100),
  patient_name VARCHAR(255),
  patient_age INTEGER,
  patient_gender VARCHAR(20),
  key_symptom VARCHAR(40),
  triage_category VARCHAR(50),
  decided_by_user_id UUID NOT NULL REFERENCES users(id),
  decided_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT triage_decisions_er_required
    CHECK (
      (outcome = 'shift_to_er' AND er_bed_id IS NOT NULL AND er_start_stage_id IS NOT NULL)
      OR
      (outcome <> 'shift_to_er' AND er_bed_id IS NULL AND er_start_stage_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_triage_decisions_triage_bed
  ON triage_decisions(triage_bed_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_triage_decisions_er_bed
  ON triage_decisions(er_bed_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_triage_decisions_outcome
  ON triage_decisions(outcome, decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_triage_decisions_decided_by
  ON triage_decisions(decided_by_user_id, decided_at DESC);

COMMENT ON TABLE triage_decisions IS
  'Recorded triage disposition outcomes. Shift-to-ER rows include target ER bed and ER starting stage.';

-- Down Migration
-- DROP TABLE IF EXISTS triage_decisions;
