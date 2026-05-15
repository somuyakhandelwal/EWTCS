-- Migration 058: Repair cath_lab_procedures canonical columns
-- Purpose: Ensure cath_lab_procedures matches canonical schema when legacy/provisional
--          migrations created a partial table shape.
-- Safe to run repeatedly.

-- Up Migration

ALTER TABLE IF EXISTS cath_lab_procedures
    ADD COLUMN IF NOT EXISTS id UUID,
    ADD COLUMN IF NOT EXISTS bed_id UUID,
    ADD COLUMN IF NOT EXISTS patient_uhid VARCHAR(100),
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
    ALTER COLUMN procedure_type TYPE VARCHAR(100) USING procedure_type::text,
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN status SET DEFAULT 'SCHEDULED';

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cath_lab_procedures' AND column_name = 'patient_id') THEN
        EXECUTE 'UPDATE cath_lab_procedures SET patient_uhid = COALESCE(patient_uhid, patient_id::text)';
        ALTER TABLE cath_lab_procedures ALTER COLUMN patient_id DROP NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cath_lab_procedures' AND column_name = 'start_time') THEN
        EXECUTE 'UPDATE cath_lab_procedures SET actual_start_time = COALESCE(actual_start_time, start_time)';
        ALTER TABLE cath_lab_procedures ALTER COLUMN start_time DROP NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cath_lab_procedures' AND column_name = 'end_time') THEN
        EXECUTE 'UPDATE cath_lab_procedures SET actual_end_time = COALESCE(actual_end_time, end_time)';
        ALTER TABLE cath_lab_procedures ALTER COLUMN end_time DROP NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cath_lab_procedures' AND column_name = 'cardiologist') THEN
        EXECUTE $sql$
            UPDATE cath_lab_procedures p
            SET cardiologist_id = u.id
            FROM users u
            WHERE p.cardiologist_id IS NULL
              AND u.role = 'cardiologist'
              AND u.is_active = true
              AND lower(u.username) = lower(trim(p.cardiologist))
        $sql$;
        ALTER TABLE cath_lab_procedures ALTER COLUMN cardiologist DROP NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cath_lab_procedures' AND column_name = 'outcome') THEN
        ALTER TABLE cath_lab_procedures ALTER COLUMN outcome DROP NOT NULL;
    END IF;
END $$;

UPDATE cath_lab_procedures
SET id = COALESCE(id, uuid_generate_v4()),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP),
    status = CASE
        WHEN upper(COALESCE(status, '')) IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') THEN upper(status)
        WHEN lower(COALESCE(status, '')) = 'active' THEN 'IN_PROGRESS'
        WHEN actual_end_time IS NOT NULL THEN 'COMPLETED'
        ELSE 'SCHEDULED'
    END,
    duration_minutes = COALESCE(
        duration_minutes,
        CASE
            WHEN actual_start_time IS NOT NULL AND actual_end_time IS NOT NULL
                THEN GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (actual_end_time - actual_start_time)) / 60)::INTEGER)
            ELSE NULL
        END
    );

ALTER TABLE cath_lab_procedures ALTER COLUMN id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'cath_lab_procedures' AND c.contype = 'p'
    ) THEN
        ALTER TABLE cath_lab_procedures ADD CONSTRAINT pk_cath_lab_procedures PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'cath_lab_procedures'
          AND c.contype = 'f'
          AND pg_get_constraintdef(c.oid) LIKE 'FOREIGN KEY (bed_id)%REFERENCES beds(id)%'
    ) THEN
        ALTER TABLE cath_lab_procedures
            ADD CONSTRAINT fk_cath_lab_procedures_bed_id
            FOREIGN KEY (bed_id) REFERENCES beds(id) ON DELETE SET NULL NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'cath_lab_procedures'
          AND c.contype = 'f'
          AND pg_get_constraintdef(c.oid) LIKE 'FOREIGN KEY (cardiologist_id)%REFERENCES users(id)%'
    ) THEN
        ALTER TABLE cath_lab_procedures
            ADD CONSTRAINT fk_cath_lab_procedures_cardiologist_id
            FOREIGN KEY (cardiologist_id) REFERENCES users(id) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_cath_lab_procedures_status') THEN
        ALTER TABLE cath_lab_procedures
            ADD CONSTRAINT chk_cath_lab_procedures_status
            CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_cath_lab_procedures_time_order') THEN
        ALTER TABLE cath_lab_procedures
            ADD CONSTRAINT chk_cath_lab_procedures_time_order
            CHECK (actual_end_time IS NULL OR actual_start_time IS NULL OR actual_end_time >= actual_start_time);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_bed_id ON cath_lab_procedures(bed_id);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_patient_uhid ON cath_lab_procedures(patient_uhid);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_cardiologist_id ON cath_lab_procedures(cardiologist_id);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_status ON cath_lab_procedures(status);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_actual_start_time ON cath_lab_procedures(actual_start_time DESC);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_procedure_type ON cath_lab_procedures(procedure_type);
