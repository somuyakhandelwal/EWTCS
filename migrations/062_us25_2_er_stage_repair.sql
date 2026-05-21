-- Migration 062: U.S 25.2 — Remove Triage from ER Workflow, Install Approved ER Stages
-- Purpose: Standardize Emergency Ward (ER) to use only the 8 approved ER stages.
--          Triage is a SEPARATE WARD (code=TRIAGE, 6 beds) and MUST NOT appear
--          as an ER stage on Emergency Ward beds.
-- APPROVED ER STAGES:
--   empty | initial investigation | initial treatment | drugs/test |
--   observation | decision made | discharge process | cleaning
-- SAFETY RULES:
--   - Uses UPDATE is_active=false, NOT DELETE — preserves historical log integrity
--   - ON CONFLICT DO NOTHING — fully idempotent, safe to apply multiple times
--   - bed_stage_logs referencing old stage IDs remain intact and readable
--   - TRIAGE ward, TRIAGE beds, /triage page remain completely unaffected
-- ============================================================
-- Up Migration
-- ============================================================
-- Step 1: Deactivate legacy ER stages (Triage, Registration, Doctor Assessment, Treatment/Observation)
-- These stages are NOT deleted — they remain for historical log FK integrity.
-- After deactivation they no longer appear in active stage queries.
UPDATE stages
SET
  is_active  = false,
  display_order = CASE WHEN display_order < 1000 THEN display_order + 1000 ELSE display_order END,
  updated_at = CURRENT_TIMESTAMP
WHERE name IN ('Triage', 'Registration', 'Doctor Assessment', 'Treatment/Observation');

-- Step 2: Insert the 8 approved ER stages
-- ON CONFLICT (name) DO NOTHING — idempotent: skips rows already present.
-- display_order starts at 0 (Empty) to match established convention.
INSERT INTO stages (name, display_order, color_code, description) VALUES
  ('Empty',                 0, 'gray',   'Bed is available and ready for next patient'),
  ('Initial Investigation', 1, 'blue',   'Doctor performing initial assessment and ordering investigations'),
  ('Initial Treatment',     2, 'cyan',   'Patient receiving first-line treatment'),
  ('Drugs/Test',            3, 'yellow', 'Awaiting medications or diagnostic test results'),
  ('Observation',           4, 'orange', 'Patient under active clinical monitoring'),
  ('Decision Made',         5, 'green',  'Discharge or admission decision has been made'),
  ('Discharge Process',     6, 'purple', 'Patient being discharged or transferred to another ward'),
  ('Cleaning',              7, 'pink',   'Bed being cleaned and prepared for the next patient')
ON CONFLICT (name) DO NOTHING;

-- Step 3: Deactivate stage_transitions that reference legacy stage names
-- is_active=false — transitions are not deleted, preserving audit lineage.
UPDATE stage_transitions
SET
  is_active  = false,
  updated_at = CURRENT_TIMESTAMP
WHERE (
  from_stage_id IN (SELECT id FROM stages WHERE name IN ('Triage', 'Registration', 'Doctor Assessment', 'Treatment/Observation'))
  OR
  to_stage_id IN (SELECT id FROM stages WHERE name IN ('Triage', 'Registration', 'Doctor Assessment', 'Treatment/Observation'))
);

-- Step 4: Insert approved ER stage transition rules
-- ON CONFLICT (from_stage_id, to_stage_id) DO NOTHING — idempotent.
INSERT INTO stage_transitions (from_stage_id, to_stage_id, is_allowed, requires_supervisor_override, description, priority)
VALUES
  -- ── FORWARD TRANSITIONS (always allowed) ──────────────────────────────────
  (
    (SELECT id FROM stages WHERE name = 'Empty'),
    (SELECT id FROM stages WHERE name = 'Initial Investigation'),
    true, false, 'Patient admitted. Doctor begins initial assessment and investigation.', 10
  ),
  (
    (SELECT id FROM stages WHERE name = 'Initial Investigation'),
    (SELECT id FROM stages WHERE name = 'Initial Treatment'),
    true, false, 'Initial investigation complete. First-line treatment commenced.', 10
  ),
  (
    (SELECT id FROM stages WHERE name = 'Initial Treatment'),
    (SELECT id FROM stages WHERE name = 'Drugs/Test'),
    true, false, 'Treatment administered. Awaiting drug response or diagnostic results.', 10
  ),
  (
    (SELECT id FROM stages WHERE name = 'Drugs/Test'),
    (SELECT id FROM stages WHERE name = 'Observation'),
    true, false, 'Test results received. Patient placed under observation.', 10
  ),
  (
    (SELECT id FROM stages WHERE name = 'Observation'),
    (SELECT id FROM stages WHERE name = 'Decision Made'),
    true, false, 'Observation complete. Clinical decision made for discharge or admission.', 10
  ),
  (
    (SELECT id FROM stages WHERE name = 'Decision Made'),
    (SELECT id FROM stages WHERE name = 'Discharge Process'),
    true, false, 'Decision documented. Patient being discharged or transferred.', 10
  ),
  (
    (SELECT id FROM stages WHERE name = 'Discharge Process'),
    (SELECT id FROM stages WHERE name = 'Cleaning'),
    true, false, 'Patient discharged. Bed cleaning and preparation started.', 10
  ),
  (
    (SELECT id FROM stages WHERE name = 'Cleaning'),
    (SELECT id FROM stages WHERE name = 'Empty'),
    true, false, 'Bed cleaned and prepared. Ready for next patient.', 10
  ),
  -- ── BACKWARD TRANSITIONS (require supervisor override) ────────────────────
  (
    (SELECT id FROM stages WHERE name = 'Observation'),
    (SELECT id FROM stages WHERE name = 'Initial Treatment'),
    false, true, 'Patient condition deteriorated during observation. Return to treatment.', 9
  ),
  (
    (SELECT id FROM stages WHERE name = 'Drugs/Test'),
    (SELECT id FROM stages WHERE name = 'Initial Investigation'),
    false, true, 'Test results indicate need for reassessment. Doctor to review.', 9
  ),
  (
    (SELECT id FROM stages WHERE name = 'Initial Treatment'),
    (SELECT id FROM stages WHERE name = 'Initial Investigation'),
    false, true, 'Clinical picture changed during treatment. Reassessment required.', 9
  ),
  -- ── SKIP TRANSITIONS (require supervisor override) ────────────────────────
  (
    (SELECT id FROM stages WHERE name = 'Initial Investigation'),
    (SELECT id FROM stages WHERE name = 'Decision Made'),
    false, true, 'Minor presentation. Patient cleared for discharge without full treatment pathway.', 8
  ),
  (
    (SELECT id FROM stages WHERE name = 'Empty'),
    (SELECT id FROM stages WHERE name = 'Observation'),
    false, true, 'Emergency readmission. Patient placed directly under observation.', 8
  ),
  (
    (SELECT id FROM stages WHERE name = 'Empty'),
    (SELECT id FROM stages WHERE name = 'Initial Treatment'),
    false, true, 'Critical case. Immediate treatment started on arrival.', 8
  )
ON CONFLICT (from_stage_id, to_stage_id) DO NOTHING;

-- ── Documentation ─────────────────────────────────────────────────────────────
COMMENT ON TABLE stages IS
  'Patient workflow stages. Emergency Ward (ER) uses the 8 approved stages: '
  'Empty, Initial Investigation, Initial Treatment, Drugs/Test, Observation, '
  'Decision Made, Discharge Process, Cleaning. '
  'Legacy stages (Triage, Registration, Doctor Assessment, Treatment/Observation) '
  'are deactivated (is_active=false) — preserved for bed_stage_logs FK integrity.';

-- ── Down Migration ─────────────────────────────────────────────────────────────
-- This migration is intentionally non-reversible.
-- Reversing would require re-activating legacy stages and transitions,
-- which risks data integrity given historical bed_stage_logs may reference
-- both old and new stage IDs after the migration runs.
-- To rollback: revert via a purpose-built forward migration.
