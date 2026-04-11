-- Migration 060: Keep beds.current_stage_id in sync with bed_stage_logs inserts
-- EPIC-DB2 / DB2-03
--
-- This trigger is a consistency backstop.
-- Primary write path remains application SQL in bed-mutations.constants.ts
-- (UPDATE_BED_STAGE_SQL), which should continue to be used for normal updates.
--
-- Scope: trigger is attached only to bed_stage_logs (live table).
-- It does NOT run for bed_stage_logs_archive archival inserts.

-- Up Migration

CREATE OR REPLACE FUNCTION sync_beds_current_stage_from_stage_logs()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE beds
    SET current_stage_id = NEW.to_stage_id,
        updated_at = NOW()
    WHERE id = NEW.bed_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_beds_current_stage_from_stage_logs ON bed_stage_logs;
CREATE TRIGGER trg_sync_beds_current_stage_from_stage_logs
AFTER INSERT ON bed_stage_logs
FOR EACH ROW
EXECUTE FUNCTION sync_beds_current_stage_from_stage_logs();

COMMENT ON FUNCTION sync_beds_current_stage_from_stage_logs() IS
    'DB2-03 consistency backstop: sync beds.current_stage_id after direct bed_stage_logs inserts.';

-- Down Migration (documented; not auto-run)
-- DROP TRIGGER IF EXISTS trg_sync_beds_current_stage_from_stage_logs ON bed_stage_logs;
-- DROP FUNCTION IF EXISTS sync_beds_current_stage_from_stage_logs();
