-- Migration 032: Enforce stage-log retention config and delete immutability
-- Purpose: Ensure stage logs are never deleted and retention cutoff is DB-configurable
-- Epic: EPIC 3 - Time Tracking & Stage Logging (US-3.6)

-- Add explicit day-based retention key for stage logs (default = 90 days)
INSERT INTO system_settings (key, value, description)
VALUES (
  'retention_bed_stage_log_days',
  '90',
  'Days to retain bed_stage_logs rows before archiving (US-3.6)'
)
ON CONFLICT (key) DO NOTHING;

-- Prevent delete from live stage logs (preserve audit trail)
CREATE OR REPLACE FUNCTION prevent_bed_stage_log_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'bed_stage_logs rows are immutable and cannot be deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_bed_stage_log_delete ON bed_stage_logs;
CREATE TRIGGER trg_prevent_bed_stage_log_delete
BEFORE DELETE ON bed_stage_logs
FOR EACH ROW EXECUTE FUNCTION prevent_bed_stage_log_delete();

-- Prevent mutation of archived stage logs
CREATE OR REPLACE FUNCTION prevent_bed_stage_log_archive_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'bed_stage_logs_archive rows are immutable and cannot be modified';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_bed_stage_log_archive_update ON bed_stage_logs_archive;
CREATE TRIGGER trg_prevent_bed_stage_log_archive_update
BEFORE UPDATE ON bed_stage_logs_archive
FOR EACH ROW EXECUTE FUNCTION prevent_bed_stage_log_archive_mutation();

DROP TRIGGER IF EXISTS trg_prevent_bed_stage_log_archive_delete ON bed_stage_logs_archive;
CREATE TRIGGER trg_prevent_bed_stage_log_archive_delete
BEFORE DELETE ON bed_stage_logs_archive
FOR EACH ROW EXECUTE FUNCTION prevent_bed_stage_log_archive_mutation();

-- Down Migration (documented; not auto-run)
-- DROP TRIGGER IF EXISTS trg_prevent_bed_stage_log_delete ON bed_stage_logs;
-- DROP FUNCTION IF EXISTS prevent_bed_stage_log_delete();
-- DROP TRIGGER IF EXISTS trg_prevent_bed_stage_log_archive_update ON bed_stage_logs_archive;
-- DROP TRIGGER IF EXISTS trg_prevent_bed_stage_log_archive_delete ON bed_stage_logs_archive;
-- DROP FUNCTION IF EXISTS prevent_bed_stage_log_archive_mutation();
-- DELETE FROM system_settings WHERE key = 'retention_bed_stage_log_days';
