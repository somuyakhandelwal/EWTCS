-- Migration 016: Add virtual bed support
-- Epic 6: Bed & Workflow Configuration (US-6.6)
-- Purpose: Track hallway/stretcher patients as virtual beds
--
-- A virtual bed is always also temporary (is_temporary = true, is_virtual = true).
-- A temporary surge bed is a real physical bed (is_temporary = true, is_virtual = false).
-- Keeping two boolean columns lets queries and UI distinguish them cleanly.

ALTER TABLE beds
    ADD COLUMN IF NOT EXISTS is_virtual BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN beds.is_virtual IS
    'US-6.6: true for nurse-created virtual beds (hallway/stretcher patients). Always paired with is_temporary = true.';

-- Partial index — only indexes the small subset of virtual beds for fast filtering
CREATE INDEX IF NOT EXISTS idx_beds_is_virtual
    ON beds (is_virtual)
    WHERE is_virtual = true;
