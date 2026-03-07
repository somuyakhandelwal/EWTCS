-- Migration 016: Add shift_id to bed_stage_logs and patient_admissions (US-8.2)
-- Purpose: Tag every stage transition and patient discharge with the active shift
-- Epic: EPIC 8 - Shift Management

-- Up Migration

-- shifts table must exist (created in migration 018)

-- Add shift_id to bed_stage_logs (nullable for backwards-compatibility with pre-migration rows)
ALTER TABLE bed_stage_logs
    ADD COLUMN IF NOT EXISTS shift_id
        UUID REFERENCES shifts(id) ON DELETE SET NULL;

-- Supervisor can manually override the auto-resolved shift (US-8.2 AC-4)
ALTER TABLE bed_stage_logs
    ADD COLUMN IF NOT EXISTS shift_override_by_user_id
        UUID REFERENCES users(id) ON DELETE SET NULL;

-- Index for shift-based filtering / analytics
CREATE INDEX IF NOT EXISTS idx_bed_stage_logs_shift_id
    ON bed_stage_logs(shift_id);

-- Tag patient admissions so discharge reports can be filtered by shift
ALTER TABLE patient_admissions
    ADD COLUMN IF NOT EXISTS shift_id
        UUID REFERENCES shifts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_patient_admissions_shift_id
    ON patient_admissions(shift_id);

COMMENT ON COLUMN bed_stage_logs.shift_id IS
    'Auto-resolved shift at transition time. NULL = pre-migration row or no active shift found.';

COMMENT ON COLUMN bed_stage_logs.shift_override_by_user_id IS
    'Supervisor who manually overrode the auto-resolved shift. NULL = system auto-tagged.';

COMMENT ON COLUMN patient_admissions.shift_id IS
    'Shift active at discharge time. NULL = pre-migration row.';

-- Down Migration
-- ALTER TABLE bed_stage_logs DROP COLUMN IF EXISTS shift_id;
-- ALTER TABLE bed_stage_logs DROP COLUMN IF EXISTS shift_override_by_user_id;
-- ALTER TABLE patient_admissions DROP COLUMN IF EXISTS shift_id;
