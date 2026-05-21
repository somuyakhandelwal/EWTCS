-- Migration 063: Deactivate 'Triage' as an ER bed stage and disable related transitions
-- Purpose: EPIC 25 — Separate Triage area from Emergency Ward bed stages
-- Notes:
--  - This migration does not delete historical rows. It marks the 'Triage' stage and any
--    stage_transitions involving it as inactive to preserve audit/history while removing
--    it from active ER workflows.
BEGIN;

-- Find the triage stage id (if it exists)
DO $$
DECLARE
  triage_id UUID;
BEGIN
  SELECT id INTO triage_id FROM stages WHERE LOWER(name) = 'triage' LIMIT 1;
  IF triage_id IS NOT NULL THEN
    -- Mark the stage inactive so it no longer appears in active ER stage lists
    UPDATE stages SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = triage_id;

    -- Disable any stage transition rules that reference triage (from or to)
    UPDATE stage_transitions
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE from_stage_id = triage_id OR to_stage_id = triage_id;

    -- Add an audit-friendly note in a lightweight table if present (skip if not)
    -- Some deployments may have a migrations_audit table; add a safe insert if exists
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'migrations_audit') THEN
        INSERT INTO migrations_audit (migration, description, created_at)
        VALUES ('063_remove_triage_from_er', 'Deactivated ''Triage'' stage and related transitions (EPIC 25)', CURRENT_TIMESTAMP);
      END IF;
    EXCEPTION WHEN undefined_table THEN
      -- ignore if migrations_audit doesn't exist
      NULL;
    END;
  END IF;
END$$;

COMMIT;

-- Down migration: re-activate triage and transitions (if needed)
-- NOTE: Re-activating restores the is_active flag but does not recreate transitions that were dropped by other migrations.
-- To roll back manually, run:
-- UPDATE stages SET is_active = true WHERE LOWER(name) = 'triage';
-- UPDATE stage_transitions SET is_active = true WHERE from_stage_id IN (SELECT id FROM stages WHERE LOWER(name) = 'triage') OR to_stage_id IN (SELECT id FROM stages WHERE LOWER(name) = 'triage');
