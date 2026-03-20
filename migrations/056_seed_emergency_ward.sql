-- Migration 052: Seed Emergency Ward (EPIC 20 - ER Triage & Patient Intake)
-- Purpose: Ensure the canonical 'Emergency Ward' (code: ER) exists in the wards
--          table before seed scripts insert ER-01..ER-30 beds under it.
--          Uses ON CONFLICT so this is safe to apply on an existing database.

-- Up Migration

INSERT INTO wards (name, code, description, is_active)
VALUES (
  'Emergency Ward',
  'ER',
  'Main Emergency Department — 30-bed general emergency ward',
  true
)
ON CONFLICT (code) DO UPDATE
  SET name        = EXCLUDED.name,
      description = EXCLUDED.description,
      is_active   = true,
      updated_at  = CURRENT_TIMESTAMP;

-- Down Migration
-- Note: We do NOT delete the ward on rollback because beds may reference it.
--       Instead we just deactivate it so it no longer appears in active queries.

-- UPDATE wards SET is_active = false WHERE code = 'ER';
