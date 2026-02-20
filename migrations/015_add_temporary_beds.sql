-- Migration 015: Add Temporary Bed Support
-- Purpose: Allow supervisor to add surge beds during mass casualty incidents
-- Epic: EPIC 6 - Bed & Workflow Configuration (US-6.2)
--
-- Temporary beds behave exactly like permanent beds in every workflow query.
-- The only difference is the is_temporary flag, which:
--   1. Controls visual badge rendering on the dashboard and admin table
--   2. Restricts creation/removal to supervisor-scoped server actions
--   3. Is included in all existing analytics queries automatically

-- Up Migration

ALTER TABLE beds
    ADD COLUMN IF NOT EXISTS is_temporary BOOLEAN NOT NULL DEFAULT false;

-- Index used by the supervisor "remove surge beds" panel
-- (filters to temporary + inactive beds for cleanup)
CREATE INDEX IF NOT EXISTS idx_beds_is_temporary
    ON beds(is_temporary)
    WHERE is_temporary = true;

COMMENT ON COLUMN beds.is_temporary IS
    'True for beds added during surge/MCI events by supervisors. '
    'Temporary beds participate in all workflow stages and analytics identically to permanent beds. '
    'Set to false on all existing rows via DEFAULT false.';

-- Down Migration
-- ALTER TABLE beds DROP COLUMN IF EXISTS is_temporary;
