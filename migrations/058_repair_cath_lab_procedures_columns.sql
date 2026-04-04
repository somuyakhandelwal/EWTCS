-- Migration 055: Repair cath_lab_procedures canonical columns
-- Purpose: Ensure cath_lab_procedures matches canonical schema when legacy/provisional
--          migrations created a partial table shape.
-- Safe to run repeatedly.

-- Up Migration

ALTER TABLE IF EXISTS cath_lab_procedures
    ADD COLUMN IF NOT EXISTS id UUID,
    ADD COLUMN IF NOT EXISTS bed_id UUID,
    ADD COLUMN IF NOT EXISTS patient_uhid VARCHAR(100),
    ADD COLUMN IF NOT EXISTS patient_uid VARCHAR(100),
    ADD COLUMN IF NOT EXISTS cardiologist_id UUID,
    ADD COLUMN IF NOT EXISTS procedure_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS procedure_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS clinical_indication TEXT,
    ADD COLUMN IF NOT EXISTS clinical_indication_encrypted JSONB,
    ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS actual_start_time TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS actual_end_time TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS findings TEXT,
    ADD COLUMN IF NOT EXISTS findings_encrypted JSONB,
    ADD COLUMN IF NOT EXISTS interventions_performed TEXT,
    ADD COLUMN IF NOT EXISTS interventions_performed_encrypted JSONB,
    ADD COLUMN IF NOT EXISTS stenosis_location VARCHAR(100),
    ADD COLUMN IF NOT EXISTS stenosis_location_encrypted JSONB,
    ADD COLUMN IF NOT EXISTS stenosis_percentage INTEGER,
    ADD COLUMN IF NOT EXISTS stenosis_percentage_encrypted JSONB,
    ADD COLUMN IF NOT EXISTS outcome TEXT,
    ADD COLUMN IF NOT EXISTS outcome_encrypted JSONB,
    ADD COLUMN IF NOT EXISTS complications TEXT,
    ADD COLUMN IF NOT EXISTS complications_encrypted JSONB,
    ADD COLUMN IF NOT EXISTS clinical_notes TEXT,
    ADD COLUMN IF NOT EXISTS clinical_notes_encrypted JSONB,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE cath_lab_procedures
    ALTER COLUMN id SET DEFAULT uuid_generate_v4(),
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN status SET DEFAULT 'SCHEDULED';

UPDATE cath_lab_procedures
SET
    id = COALESCE(id, uuid_generate_v4()),
    patient_uid = COALESCE(patient_uid, patient_uhid),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP),
    status = COALESCE(status, 'SCHEDULED');

ALTER TABLE cath_lab_procedures
    ALTER COLUMN id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND t.relname = 'cath_lab_procedures'
          AND c.contype = 'p'
    ) THEN
        ALTER TABLE cath_lab_procedures
            ADD CONSTRAINT pk_cath_lab_procedures PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'cath_lab_procedures'
          AND column_name = 'cardiologist_id'
    ) THEN
        ALTER TABLE cath_lab_procedures
            ALTER COLUMN cardiologist_id SET NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND t.relname = 'cath_lab_procedures'
          AND c.contype = 'f'
          AND pg_get_constraintdef(c.oid) LIKE 'FOREIGN KEY (bed_id)%REFERENCES beds(id)%'
    ) THEN
        ALTER TABLE cath_lab_procedures
            ADD CONSTRAINT fk_cath_lab_procedures_bed_id
            FOREIGN KEY (bed_id) REFERENCES beds(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND t.relname = 'cath_lab_procedures'
          AND c.contype = 'f'
          AND pg_get_constraintdef(c.oid) LIKE 'FOREIGN KEY (cardiologist_id)%REFERENCES users(id)%'
    ) THEN
        ALTER TABLE cath_lab_procedures
            ADD CONSTRAINT fk_cath_lab_procedures_cardiologist_id
            FOREIGN KEY (cardiologist_id) REFERENCES users(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_cath_lab_procedures_status'
    ) THEN
        ALTER TABLE cath_lab_procedures
            ADD CONSTRAINT chk_cath_lab_procedures_status
            CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_cath_lab_procedures_stenosis_percentage'
    ) THEN
        ALTER TABLE cath_lab_procedures
            ADD CONSTRAINT chk_cath_lab_procedures_stenosis_percentage
            CHECK (stenosis_percentage IS NULL OR (stenosis_percentage BETWEEN 0 AND 100));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_bed_id ON cath_lab_procedures(bed_id);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_patient_uhid ON cath_lab_procedures(patient_uhid);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_patient_uid ON cath_lab_procedures(patient_uid);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_cardiologist_id ON cath_lab_procedures(cardiologist_id);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_status ON cath_lab_procedures(status);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_scheduled_start ON cath_lab_procedures(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_actual_start_time ON cath_lab_procedures(actual_start_time DESC);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_procedure_type ON cath_lab_procedures(procedure_type);

-- Down Migration
-- No-op: repair migration is intentionally irreversible.
