-- Migration 059: Extend cath_lab_procedures table (EPIC 20 - US-20.4)
-- Purpose: Migration 046 originally created a minimal cath_lab_procedures table.
--          This strictly safe append-only migration extends it with full cardiology
--          fields: bed linkage, UHID, cardiologist FK, clinical data, encrypted PHI.

-- Up Migration
ALTER TABLE cath_lab_procedures
  ADD COLUMN IF NOT EXISTS bed_id           UUID REFERENCES beds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS patient_uhid     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS cardiologist_id  UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS procedure_code   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS clinical_indication           TEXT,
  ADD COLUMN IF NOT EXISTS clinical_indication_encrypted JSONB,
  ADD COLUMN IF NOT EXISTS scheduled_start    TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS actual_start_time  TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS actual_end_time    TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS duration_minutes   INTEGER,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
  ADD COLUMN IF NOT EXISTS findings            TEXT,
  ADD COLUMN IF NOT EXISTS findings_encrypted  JSONB,
  ADD COLUMN IF NOT EXISTS interventions_performed           TEXT,
  ADD COLUMN IF NOT EXISTS interventions_performed_encrypted JSONB,
  ADD COLUMN IF NOT EXISTS stenosis_location           VARCHAR(100),
  ADD COLUMN IF NOT EXISTS stenosis_location_encrypted JSONB,
  ADD COLUMN IF NOT EXISTS stenosis_percentage         INTEGER,
  ADD COLUMN IF NOT EXISTS stenosis_percentage_encrypted JSONB,
  ADD COLUMN IF NOT EXISTS outcome_encrypted             JSONB,
  ADD COLUMN IF NOT EXISTS complications                 TEXT,
  ADD COLUMN IF NOT EXISTS complications_encrypted       JSONB,
  ADD COLUMN IF NOT EXISTS clinical_notes           TEXT,
  ADD COLUMN IF NOT EXISTS clinical_notes_encrypted JSONB;

-- Guard constraints to ensure idempotency on re-runs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_cath_lab_status' AND conrelid = 'cath_lab_procedures'::regclass) THEN
    ALTER TABLE cath_lab_procedures ADD CONSTRAINT chk_cath_lab_status CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_cath_lab_stenosis_pct' AND conrelid = 'cath_lab_procedures'::regclass) THEN
    ALTER TABLE cath_lab_procedures ADD CONSTRAINT chk_cath_lab_stenosis_pct CHECK (stenosis_percentage IS NULL OR stenosis_percentage BETWEEN 0 AND 100);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_bed_id ON cath_lab_procedures(bed_id);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_patient_uhid ON cath_lab_procedures(patient_uhid);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_cardiologist_id ON cath_lab_procedures(cardiologist_id);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_status ON cath_lab_procedures(status);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_scheduled_start ON cath_lab_procedures(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_actual_start_time ON cath_lab_procedures(actual_start_time DESC);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_procedure_type ON cath_lab_procedures(procedure_type);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_cardiologist_date ON cath_lab_procedures(cardiologist_id, actual_start_time DESC);

-- Down Migration
ALTER TABLE cath_lab_procedures
  DROP COLUMN IF EXISTS bed_id,
  DROP COLUMN IF EXISTS patient_uhid,
  DROP COLUMN IF EXISTS cardiologist_id,
  DROP COLUMN IF EXISTS procedure_code,
  DROP COLUMN IF EXISTS clinical_indication,
  DROP COLUMN IF EXISTS clinical_indication_encrypted,
  DROP COLUMN IF EXISTS scheduled_start,
  DROP COLUMN IF EXISTS actual_start_time,
  DROP COLUMN IF EXISTS actual_end_time,
  DROP COLUMN IF EXISTS duration_minutes,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS findings,
  DROP COLUMN IF EXISTS findings_encrypted,
  DROP COLUMN IF EXISTS interventions_performed,
  DROP COLUMN IF EXISTS interventions_performed_encrypted,
  DROP COLUMN IF EXISTS stenosis_location,
  DROP COLUMN IF EXISTS stenosis_location_encrypted,
  DROP COLUMN IF EXISTS stenosis_percentage,
  DROP COLUMN IF EXISTS stenosis_percentage_encrypted,
  DROP COLUMN IF EXISTS outcome_encrypted,
  DROP COLUMN IF EXISTS complications,
  DROP COLUMN IF EXISTS complications_encrypted,
  DROP COLUMN IF EXISTS clinical_notes,
  DROP COLUMN IF EXISTS clinical_notes_encrypted;
