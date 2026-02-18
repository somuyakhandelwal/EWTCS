-- Migration 012: Expand disposition delay reasons (US-1.7)
-- Purpose: Add 'no_icu_bed' and 'no_general_ward_bed' enum values
--
-- This migration is fully self-contained. Migration 011's SQL file lacks an
-- '-- Up Migration' marker, so node-pg-migrate executes its Down section on a
-- fresh database (drops the type and table it just created). This migration
-- compensates by recreating both if they are missing.

-- Up Migration

DO $$
DECLARE
    v_type_exists  boolean;
    v_table_exists boolean;
    v_value_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'disposition_delay_reason_type'
    ) INTO v_type_exists;

    IF NOT v_type_exists THEN
        EXECUTE $q$
            CREATE TYPE disposition_delay_reason_type AS ENUM (
                'no_bed_upstairs',
                'awaiting_transport',
                'family_consent',
                'awaiting_specialist',
                'other',
                'no_icu_bed',
                'no_general_ward_bed'
            )
        $q$;
    ELSE
        SELECT EXISTS (
            SELECT 1
            FROM   pg_enum e
            JOIN   pg_type t ON e.enumtypid = t.oid
            WHERE  t.typname   = 'disposition_delay_reason_type'
            AND    e.enumlabel = 'no_icu_bed'
        ) INTO v_value_exists;

        IF NOT v_value_exists THEN
            EXECUTE 'ALTER TYPE disposition_delay_reason_type RENAME TO disposition_delay_reason_type_old';
            EXECUTE $q$
                CREATE TYPE disposition_delay_reason_type AS ENUM (
                    'no_bed_upstairs',
                    'awaiting_transport',
                    'family_consent',
                    'awaiting_specialist',
                    'other',
                    'no_icu_bed',
                    'no_general_ward_bed'
                )
            $q$;
            EXECUTE $q$
                ALTER TABLE disposition_delay_reasons
                    ALTER COLUMN reason TYPE disposition_delay_reason_type
                    USING reason::text::disposition_delay_reason_type
            $q$;
            EXECUTE 'DROP TYPE disposition_delay_reason_type_old';
        END IF;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM   information_schema.tables
        WHERE  table_schema = 'public'
        AND    table_name   = 'disposition_delay_reasons'
    ) INTO v_table_exists;

    IF NOT v_table_exists THEN
        EXECUTE $q$
            CREATE TABLE disposition_delay_reasons (
                id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                bed_id              UUID NOT NULL REFERENCES beds(id) ON DELETE CASCADE,
                bed_stage_log_id    UUID REFERENCES bed_stage_logs(id) ON DELETE SET NULL,
                reason              disposition_delay_reason_type NOT NULL,
                notes               TEXT,
                recorded_by_user_id UUID NOT NULL REFERENCES users(id),
                recorded_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                resolved_at         TIMESTAMP WITH TIME ZONE
            )
        $q$;
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_disposition_delay_bed_id ON disposition_delay_reasons(bed_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_disposition_delay_log_id ON disposition_delay_reasons(bed_stage_log_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_disposition_delay_resolved ON disposition_delay_reasons(resolved_at) WHERE resolved_at IS NULL';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_bed_stage_logs_bed_to_stage ON bed_stage_logs(bed_id, to_stage_id)';
    END IF;
END $$;

-- Down Migration

DO $$
DECLARE
    v_value_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM   pg_enum e
        JOIN   pg_type t ON e.enumtypid = t.oid
        WHERE  t.typname   = 'disposition_delay_reason_type'
        AND    e.enumlabel = 'no_icu_bed'
    ) INTO v_value_exists;

    IF v_value_exists THEN
        EXECUTE 'ALTER TYPE disposition_delay_reason_type RENAME TO disposition_delay_reason_type_new';
        EXECUTE $q$
            CREATE TYPE disposition_delay_reason_type AS ENUM (
                'no_bed_upstairs',
                'awaiting_transport',
                'family_consent',
                'awaiting_specialist',
                'other'
            )
        $q$;
        EXECUTE $q$
            ALTER TABLE disposition_delay_reasons
                ALTER COLUMN reason TYPE disposition_delay_reason_type
                USING reason::text::disposition_delay_reason_type
        $q$;
        EXECUTE 'DROP TYPE disposition_delay_reason_type_new';
    END IF;
END $$;
