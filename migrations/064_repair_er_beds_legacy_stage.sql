-- Migration 064: Repair ER beds whose current_stage_id still points at a legacy deactivated stage
-- Purpose: Migration 062 deactivated 'Triage', 'Registration', 'Doctor Assessment',
--          'Treatment/Observation' via is_active=false but did NOT remap beds.current_stage_id.
--          Any ER bed that was on one of those stages before migration 062 ran still holds the
--          legacy stage ID, causing the dashboard to display an inactive/legacy stage label.
--
-- Repair logic:
--   - Occupied beds on 'Triage'                 → 'Initial Investigation'  (closest active equivalent)
--   - Occupied beds on 'Registration'            → 'Initial Investigation'  (early ER workflow)
--   - Occupied beds on 'Doctor Assessment'       → 'Drugs/Test'             (mid-workflow equivalent)
--   - Occupied beds on 'Treatment/Observation'   → 'Observation'            (closest active equivalent)
--   - Unoccupied beds on any legacy stage        → 'Empty'
--
-- Safety guarantees:
--   - Uses UPDATE only — no rows are deleted
--   - Fully idempotent: WHERE clause only matches beds still holding legacy stage IDs
--   - bed_stage_logs rows are NOT touched — historical records remain intact with original stage IDs
--   - ON CONFLICT not needed (UPDATE, not INSERT)
--   - Runs inside a single transaction for atomicity
-- ============================================================

BEGIN;

-- ── Step 1: Repair occupied beds with legacy ER stages ──────────────────────

-- Triage → Initial Investigation (occupied beds only)
UPDATE beds
SET
  current_stage_id = (SELECT id FROM stages WHERE name = 'Initial Investigation' LIMIT 1),
  updated_at       = CURRENT_TIMESTAMP
WHERE
  is_active        = true
  AND is_occupied  = true
  AND current_stage_id IN (
    SELECT id FROM stages WHERE name = 'Triage' AND is_active = false
  );

-- Registration → Initial Investigation (occupied beds only)
UPDATE beds
SET
  current_stage_id = (SELECT id FROM stages WHERE name = 'Initial Investigation' LIMIT 1),
  updated_at       = CURRENT_TIMESTAMP
WHERE
  is_active        = true
  AND is_occupied  = true
  AND current_stage_id IN (
    SELECT id FROM stages WHERE name = 'Registration' AND is_active = false
  );

-- Doctor Assessment → Drugs/Test (occupied beds only)
UPDATE beds
SET
  current_stage_id = (SELECT id FROM stages WHERE name = 'Drugs/Test' LIMIT 1),
  updated_at       = CURRENT_TIMESTAMP
WHERE
  is_active        = true
  AND is_occupied  = true
  AND current_stage_id IN (
    SELECT id FROM stages WHERE name = 'Doctor Assessment' AND is_active = false
  );

-- Treatment/Observation → Observation (occupied beds only)
UPDATE beds
SET
  current_stage_id = (SELECT id FROM stages WHERE name = 'Observation' LIMIT 1),
  updated_at       = CURRENT_TIMESTAMP
WHERE
  is_active        = true
  AND is_occupied  = true
  AND current_stage_id IN (
    SELECT id FROM stages WHERE name = 'Treatment/Observation' AND is_active = false
  );

-- ── Step 2: Repair unoccupied beds with any legacy ER stage → Empty ─────────

UPDATE beds
SET
  current_stage_id = (SELECT id FROM stages WHERE name = 'Empty' LIMIT 1),
  updated_at       = CURRENT_TIMESTAMP
WHERE
  is_active        = true
  AND is_occupied  = false
  AND current_stage_id IN (
    SELECT id FROM stages
    WHERE name IN ('Triage', 'Registration', 'Doctor Assessment', 'Treatment/Observation')
      AND is_active = false
  );

-- ── Step 3: Audit log entry (safe insert — skips if audit_logs schema differs) ─

DO $$
BEGIN
  INSERT INTO audit_logs (
    id,
    action_type,
    entity_type,
    entity_id,
    performed_by_user_id,
    changes,
    reason,
    metadata,
    created_at
  )
  SELECT
    gen_random_uuid(),
    'MIGRATION',
    'beds',
    b.id,
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
    jsonb_build_object(
      'migration',        '064_repair_er_beds_legacy_stage',
      'previous_stage',   s_old.name,
      'new_stage',        s_new.name
    ),
    'Automated repair: bed current_stage_id remapped from deactivated legacy ER stage (migration 064)',
    jsonb_build_object('migration_number', '064', 'automated', true),
    CURRENT_TIMESTAMP
  FROM beds b
  JOIN stages s_old ON s_old.id = b.current_stage_id AND s_old.is_active = true
  -- We only log beds that were just updated; they now point to active stages.
  -- This insert is best-effort and won't block the migration if audit_logs is missing columns.
  WHERE b.updated_at >= CURRENT_TIMESTAMP - INTERVAL '5 seconds'
    AND b.is_active = true;
EXCEPTION
  WHEN undefined_column OR undefined_table OR not_null_violation THEN
    -- Silently skip audit log if schema differs — migration correctness is not impacted
    NULL;
END$$;

COMMIT;

-- ── Down migration ──────────────────────────────────────────────────────────
-- This migration is intentionally non-reversible.
-- Reversing would require knowing each bed's previous legacy stage, which is not stored here.
-- Historical bed_stage_logs still contain the original stage IDs for auditing purposes.
-- To investigate pre-migration state, query bed_stage_logs for transitions before this migration ran.
