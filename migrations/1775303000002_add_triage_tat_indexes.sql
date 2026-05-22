-- Migration 1775303000002: Add indexes for EPIC 25 triage TAT queries
-- Purpose: Support triage assignment -> cleaning and cleaning -> empty analytics.

CREATE INDEX IF NOT EXISTS idx_triage_logs_bed_time
  ON triage_state_logs(bed_id, transition_time);

CREATE INDEX IF NOT EXISTS idx_triage_logs_to_state_time
  ON triage_state_logs(to_state, transition_time);

CREATE INDEX IF NOT EXISTS idx_triage_logs_from_state_to_state_time
  ON triage_state_logs(from_state, to_state, transition_time);
