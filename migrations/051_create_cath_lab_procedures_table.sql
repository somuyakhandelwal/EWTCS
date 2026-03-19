-- Migration 051: Extend cath_lab_procedures table (EPIC 20 - US-20.4)
-- Purpose: Migration 046 created a minimal cath_lab_procedures table (CAG/PTCA only).
--          This migration extends it with full cardiology procedure fields:
--          bed linkage, UHID, cardiologist FK, status, clinical data, encrypted PHI columns.
-- Strategy: ALTER TABLE ... ADD COLUMN IF NOT EXISTS (safe to re-run, never re-creates).

-- Up Migration

-- 1. Core patient and bed linkage -----------------------------------------
ALTER TABLE cath_lab_procedures
  ADD COLUMN IF NOT EXISTS bed_id           UUID REFERENCES beds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS patient_uhid     VARCHAR(100);

-- 2. Structured cardiologist FK (replaces free-text cardiologist column) ---
ALTER TABLE cath_lab_procedures
  ADD COLUMN IF NOT EXISTS cardiologist_id  UUID REFERENCES users(id);

-- 3. Procedure classification ---------------------------------------------
ALTER TABLE cath_lab_procedures
  ADD COLUMN IF NOT EXISTS procedure_code   VARCHAR(20); -- ICD-9 or other standardized code

-- 4. Clinical indication (plaintext + encrypted PHI) ----------------------
ALTER TABLE cath_lab_procedures
  ADD COLUMN IF NOT EXISTS clinical_indication           TEXT,
  ADD COLUMN IF NOT EXISTS clinical_indication_encrypted JSONB;

-- 5. Scheduling and timing ------------------------------------------------
ALTER TABLE cath_lab_procedures
  ADD COLUMN IF NOT EXISTS scheduled_start    TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS actual_start_time  TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS actual_end_time    TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS duration_minutes   INTEGER;

-- 6. Status tracking (SCHEDULED → IN_PROGRESS → COMPLETED/CANCELLED) ------
ALTER TABLE cath_lab_procedures
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED';

-- Add CHECK constraint only if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_cath_lab_status' AND conrelid = 'cath_lab_procedures'::regclass
  ) THEN
    ALTER TABLE cath_lab_procedures
      ADD CONSTRAINT chk_cath_lab_status
        CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'));
  END IF;
END $$;

-- 7. Diagnostic findings (plaintext + encrypted) --------------------------
ALTER TABLE cath_lab_procedures
  ADD COLUMN IF NOT EXISTS findings            TEXT,
  ADD COLUMN IF NOT EXISTS findings_encrypted  JSONB;

-- 8. Interventions performed (plaintext + encrypted) ----------------------
ALTER TABLE cath_lab_procedures
  ADD COLUMN IF NOT EXISTS interventions_performed           TEXT,
  ADD COLUMN IF NOT EXISTS interventions_performed_encrypted JSONB;

-- 9. Stenosis / pathology details (cardiac-specific) ----------------------
ALTER TABLE cath_lab_procedures
  ADD COLUMN IF NOT EXISTS stenosis_location           VARCHAR(100),
  ADD COLUMN IF NOT EXISTS stenosis_location_encrypted JSONB,
  ADD COLUMN IF NOT EXISTS stenosis_percentage         INTEGER,
  ADD COLUMN IF NOT EXISTS stenosis_percentage_encrypted JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_cath_lab_stenosis_pct' AND conrelid = 'cath_lab_procedures'::regclass
  ) THEN
    ALTER TABLE cath_lab_procedures
      ADD CONSTRAINT chk_cath_lab_stenosis_pct
        CHECK (stenosis_percentage IS NULL OR stenosis_percentage BETWEEN 0 AND 100);
  END IF;
END $$;

-- 10. Outcome & complications (plaintext + encrypted) ----------------------
ALTER TABLE cath_lab_procedures
  ADD COLUMN IF NOT EXISTS outcome_encrypted             JSONB,
  ADD COLUMN IF NOT EXISTS complications                 TEXT,
  ADD COLUMN IF NOT EXISTS complications_encrypted       JSONB;

-- 11. Clinical notes -------------------------------------------------------
ALTER TABLE cath_lab_procedures
  ADD COLUMN IF NOT EXISTS clinical_notes           TEXT,
  ADD COLUMN IF NOT EXISTS clinical_notes_encrypted JSONB;

-- 12. Indexes — IF NOT EXISTS makes these safe to re-run -----------------
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_bed_id
    ON cath_lab_procedures(bed_id);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_patient_uhid
    ON cath_lab_procedures(patient_uhid);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_cardiologist_id
    ON cath_lab_procedures(cardiologist_id);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_status
    ON cath_lab_procedures(status);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_scheduled_start
    ON cath_lab_procedures(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_actual_start_time
    ON cath_lab_procedures(actual_start_time DESC);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_procedure_type
    ON cath_lab_procedures(procedure_type);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_cardiologist_date
    ON cath_lab_procedures(cardiologist_id, actual_start_time DESC);

-- 13. Column documentation ------------------------------------------------
COMMENT ON COLUMN cath_lab_procedures.bed_id IS
    'ER bed this procedure is linked to (nullable — some procedures are not bed-based)';
COMMENT ON COLUMN cath_lab_procedures.patient_uhid IS
    'Universal Hospital ID — structured identifier added by migration 051';
COMMENT ON COLUMN cath_lab_procedures.cardiologist_id IS
    'FK to users.id — replaces free-text cardiologist column from migration 046';
COMMENT ON COLUMN cath_lab_procedures.status IS
    'Procedure status: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED';
COMMENT ON COLUMN cath_lab_procedures.clinical_indication IS
    'Clinical reason for the procedure (plaintext — will migrate to encrypted)';
COMMENT ON COLUMN cath_lab_procedures.stenosis_percentage IS
    'Degree of stenosis (0-100%) if present (plaintext — will migrate to encrypted)';

-- Down Migration
-- These columns were added by migration 051; drop them to revert.
-- ALTER TABLE cath_lab_procedures
--   DROP COLUMN IF EXISTS bed_id,
--   DROP COLUMN IF EXISTS patient_uhid,
--   DROP COLUMN IF EXISTS cardiologist_id,
--   DROP COLUMN IF EXISTS procedure_code,
--   DROP COLUMN IF EXISTS clinical_indication,
--   DROP COLUMN IF EXISTS clinical_indication_encrypted,
--   DROP COLUMN IF EXISTS scheduled_start,
--   DROP COLUMN IF EXISTS actual_start_time,
--   DROP COLUMN IF EXISTS actual_end_time,
--   DROP COLUMN IF EXISTS duration_minutes,
--   DROP COLUMN IF EXISTS status,
--   DROP COLUMN IF EXISTS findings,
--   DROP COLUMN IF EXISTS findings_encrypted,
--   DROP COLUMN IF EXISTS interventions_performed,
--   DROP COLUMN IF EXISTS interventions_performed_encrypted,
--   DROP COLUMN IF EXISTS stenosis_location,
--   DROP COLUMN IF EXISTS stenosis_location_encrypted,
--   DROP COLUMN IF EXISTS stenosis_percentage,
--   DROP COLUMN IF EXISTS stenosis_percentage_encrypted,
--   DROP COLUMN IF EXISTS outcome_encrypted,
--   DROP COLUMN IF EXISTS complications,
--   DROP COLUMN IF EXISTS complications_encrypted,
--   DROP COLUMN IF EXISTS clinical_notes,
--   DROP COLUMN IF EXISTS clinical_notes_encrypted;
