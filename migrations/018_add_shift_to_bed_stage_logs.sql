-- Add shift_id to bed_stage_logs
-- EPIC 8: Shift Management (US-8.2)
-- Tag every log entry with the shift that was active at transition time.
-- NULL is allowed so historical rows (before migration) remain valid.

ALTER TABLE bed_stage_logs
  ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bed_logs_shift ON bed_stage_logs(shift_id);

COMMENT ON COLUMN bed_stage_logs.shift_id IS
  'Shift active at transition_time. NULL for rows written before EPIC 8.';
