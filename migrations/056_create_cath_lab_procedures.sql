-- Migration 046: Create cath_lab_procedures table (US-24.1)
-- Purpose: Dedicated cardiology emergency workflow logging for CAG/PTCA procedures.

-- Up Migration

CREATE TYPE cath_lab_procedure_type AS ENUM ('CAG', 'PTCA');

CREATE TABLE IF NOT EXISTS cath_lab_procedures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_type  cath_lab_procedure_type NOT NULL,
  patient_id      TEXT NOT NULL,
  cardiologist    TEXT NOT NULL,
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  outcome         TEXT NOT NULL,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_cath_lab_end_after_start CHECK (end_time >= start_time),
  CONSTRAINT chk_cath_lab_patient_id_not_blank CHECK (length(trim(patient_id)) > 0),
  CONSTRAINT chk_cath_lab_cardiologist_not_blank CHECK (length(trim(cardiologist)) > 0),
  CONSTRAINT chk_cath_lab_outcome_not_blank CHECK (length(trim(outcome)) > 0)
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cath_lab_procedures' AND column_name = 'start_time'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_start_time
      ON cath_lab_procedures(start_time DESC);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cath_lab_procedures' AND column_name = 'procedure_type'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_type
      ON cath_lab_procedures(procedure_type);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cath_lab_procedures' AND column_name = 'cardiologist'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_cardiologist
      ON cath_lab_procedures(cardiologist);
  END IF;
END $$;

COMMENT ON TABLE cath_lab_procedures IS 'Cath lab specific procedure logs for CAG/PTCA throughput tracking (US-24.1)';
COMMENT ON COLUMN cath_lab_procedures.patient_id IS 'Hospital patient identifier (MRN/UHID/registration id as provided at procedure time)';
COMMENT ON COLUMN cath_lab_procedures.cardiologist IS 'Cardiologist performing or supervising the procedure';
COMMENT ON COLUMN cath_lab_procedures.outcome IS 'Procedure outcome summary';

-- Down Migration

DROP TABLE IF EXISTS cath_lab_procedures;
DROP TYPE IF EXISTS cath_lab_procedure_type;
