-- Repair OT and Cath Lab tracking schemas without dropping existing logs.

-- OT: make legacy/provisional procedure tables compatible with the app.
ALTER TABLE IF EXISTS ot_procedures
    ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4(),
    ADD COLUMN IF NOT EXISTS ot_id UUID,
    ADD COLUMN IF NOT EXISTS bed_id UUID,
    ADD COLUMN IF NOT EXISTS patient_uhid VARCHAR(100),
    ADD COLUMN IF NOT EXISTS procedure_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS procedure_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS surgeon_id UUID,
    ADD COLUMN IF NOT EXISTS anesthetist_id UUID,
    ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS actual_start_time TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS actual_finish_time TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS outcome TEXT,
    ADD COLUMN IF NOT EXISTS outcome_encrypted JSONB,
    ADD COLUMN IF NOT EXISTS complications TEXT,
    ADD COLUMN IF NOT EXISTS complications_encrypted JSONB,
    ADD COLUMN IF NOT EXISTS clinical_notes TEXT,
    ADD COLUMN IF NOT EXISTS clinical_notes_encrypted JSONB,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

DO $$
BEGIN
    IF to_regclass('public.ot_procedures') IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'ot_procedures' AND column_name = 'room_id'
        ) THEN
            EXECUTE $sql$
                UPDATE ot_procedures p
                SET ot_id = r.id
                FROM ot_rooms r
                WHERE p.ot_id IS NULL
                  AND (p.room_id::text = r.id::text OR p.room_id::text = r.room_number)
            $sql$;
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'ot_procedures' AND column_name = 'patient_name'
        ) THEN
            EXECUTE $sql$
                UPDATE ot_procedures
                SET procedure_name = COALESCE(procedure_name, patient_name::text, 'Legacy procedure')
            $sql$;
        END IF;

        UPDATE ot_procedures
        SET id = COALESCE(id, uuid_generate_v4()),
            procedure_name = COALESCE(procedure_name, 'Legacy procedure'),
            created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
            updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP),
            status = CASE
                WHEN upper(COALESCE(status, '')) IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')
                    THEN upper(status)
                WHEN lower(COALESCE(status, '')) = 'active' THEN 'IN_PROGRESS'
                WHEN lower(COALESCE(status, '')) = 'in_progress' THEN 'IN_PROGRESS'
                WHEN lower(COALESCE(status, '')) = 'completed' THEN 'COMPLETED'
                ELSE 'SCHEDULED'
            END;

        ALTER TABLE ot_procedures
            ALTER COLUMN id SET DEFAULT uuid_generate_v4(),
            ALTER COLUMN id SET NOT NULL,
            ALTER COLUMN surgeon_id DROP NOT NULL,
            ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
            ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP,
            ALTER COLUMN status SET DEFAULT 'SCHEDULED';
    END IF;
END $$;

DO $$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'ot_procedures'
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid) ILIKE '%status%'
          AND c.conname <> 'chk_ot_procedures_status'
    LOOP
        EXECUTE format('ALTER TABLE ot_procedures DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END LOOP;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ot_procedures_status') THEN
        ALTER TABLE ot_procedures
            ADD CONSTRAINT chk_ot_procedures_status
            CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ot_procedures_ot_id ON ot_procedures(ot_id);
CREATE INDEX IF NOT EXISTS idx_ot_procedures_status ON ot_procedures(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ot_procedures_one_active_per_room
    ON ot_procedures(ot_id)
    WHERE status = 'IN_PROGRESS';

-- Cath Lab: preserve legacy rows while ensuring canonical columns are available.
ALTER TABLE IF EXISTS cath_lab_procedures
    ADD COLUMN IF NOT EXISTS patient_uhid VARCHAR(100),
    ADD COLUMN IF NOT EXISTS cardiologist_id UUID,
    ADD COLUMN IF NOT EXISTS actual_start_time TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS actual_end_time TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS clinical_notes TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

DO $$
BEGIN
    IF to_regclass('public.cath_lab_procedures') IS NOT NULL THEN
        ALTER TABLE cath_lab_procedures
            ALTER COLUMN procedure_type TYPE VARCHAR(100) USING procedure_type::text,
            ALTER COLUMN status SET DEFAULT 'SCHEDULED',
            ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'cath_lab_procedures' AND column_name = 'patient_id'
        ) THEN
            EXECUTE 'UPDATE cath_lab_procedures SET patient_uhid = COALESCE(patient_uhid, patient_id::text)';
            ALTER TABLE cath_lab_procedures ALTER COLUMN patient_id DROP NOT NULL;
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'cath_lab_procedures' AND column_name = 'start_time'
        ) THEN
            EXECUTE 'UPDATE cath_lab_procedures SET actual_start_time = COALESCE(actual_start_time, start_time)';
            ALTER TABLE cath_lab_procedures ALTER COLUMN start_time DROP NOT NULL;
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'cath_lab_procedures' AND column_name = 'end_time'
        ) THEN
            EXECUTE 'UPDATE cath_lab_procedures SET actual_end_time = COALESCE(actual_end_time, end_time)';
            ALTER TABLE cath_lab_procedures ALTER COLUMN end_time DROP NOT NULL;
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'cath_lab_procedures' AND column_name = 'cardiologist'
        ) THEN
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

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'cath_lab_procedures' AND column_name = 'outcome'
        ) THEN
            ALTER TABLE cath_lab_procedures ALTER COLUMN outcome DROP NOT NULL;
        END IF;

        UPDATE cath_lab_procedures
        SET status = CASE
                WHEN upper(COALESCE(status, '')) IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')
                    THEN upper(status)
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
            ),
            updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_patient_uhid ON cath_lab_procedures(patient_uhid);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_cardiologist_id ON cath_lab_procedures(cardiologist_id);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_actual_start_time ON cath_lab_procedures(actual_start_time DESC);
