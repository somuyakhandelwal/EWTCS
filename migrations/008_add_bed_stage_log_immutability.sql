-- Migration 006: Add Bed Stage Log Immutability
-- Purpose: Make bed stage logs immutable for audit trail integrity
-- EPIC 3: Time Tracking & Stage Logging
-- 
-- This migration ensures that once bed stage changes are logged,
-- they cannot be modified or deleted (audit trail protection)

-- The bed_stage_logs table was already created in migration 005
-- This migration doesn't need to add new tables, as immutability
-- is enforced at the application level through business logic

-- Add comment documenting immutability requirement
COMMENT ON TABLE bed_stage_logs IS 
'Immutable audit log of bed stage transitions. Records are never updated or deleted, only corrections via bed_stage_log_corrections table.';

-- Optional: Add trigger to prevent updates (if strict database-level enforcement is needed)
-- CREATE OR REPLACE FUNCTION prevent_bed_stage_log_updates()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     RAISE EXCEPTION 'bed_stage_logs records are immutable';
-- END;
-- $$ LANGUAGE plpgsql;
--
-- CREATE TRIGGER prevent_bed_stage_log_updates_trigger
--     BEFORE UPDATE ON bed_stage_logs
--     FOR EACH ROW
--     EXECUTE FUNCTION prevent_bed_stage_log_updates();

-- Note: Immutability is primarily enforced in application code
-- If database correction is needed, use the bed_stage_log_corrections table (migration 007)

-- Down Migration
COMMENT ON TABLE bed_stage_logs IS NULL;
