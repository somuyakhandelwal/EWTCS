-- Migration 012: Expand disposition delay reasons (US-1.7)
-- Purpose: Add 'no_icu_bed' and 'no_general_ward_bed' enum values
--
-- This migration is fully self-contained. Migration 011's SQL file lacks an
-- '-- Up Migration' marker, causing node-pg-migrate to execute its Down section
-- on a fresh database (drops the type and table it just created). This migration
-- compensates by recreating both if they are missing.

-- Up Migration

DO $$
DECLARE
    v_type_exists   boolean;
    v_table_exists  boolean;
    v_value_exists  boolean;
BEGIN
    -- ── 1. Ensure the enum type exists with all 7 values ──────────────────────

    SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'disposition_delay_reason_type'
    ) INTO v_type_exists;

    IF NOT v_type_exists THEN
        -- Type was never created (or was dropped by 011's misfire). Create fresh.
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
        -- Type exists (created correctly by 011). Check if the new values are there.
        SELECT EXISTS (
            SELECT 1
            FROM   pg_enum e
            JOIN   pg_type t ON e.enumtypid = t.oid
            WHERE  t.typname   = 'disposition_delay_reason_type'
            AND    e.enumlabel = 'no_icu_bed'
        ) INTO v_value_exists;

        IF NOT v_value_exists THEN
            -- Rename-create-drop is the only transaction-safe way to extend an enum.
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

    -- ── 2. Ensure the table exists (recreate if 011's down section dropped it) ─

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

        EXECUTE $q$
            COMMENT ON TABLE disposition_delay_reasons IS
                'Records reasons for patients stuck in Decision Made stage (US-1.6 / US-1.7)'
        $q$;

        -- Restore the indexes that 011 would have created
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_disposition_delay_bed_id
                     ON disposition_delay_reasons(bed_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_disposition_delay_log_id
                     ON disposition_delay_reasons(bed_stage_log_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_disposition_delay_resolved
                     ON disposition_delay_reasons(resolved_at) WHERE resolved_at IS NULL';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_bed_stage_logs_bed_to_stage
                     ON bed_stage_logs(bed_id, to_stage_id)';
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
DECLARE
    type_exists   boolean;
    values_added  boolean;
BEGIN
    -- Check if the enum type exists at all
    SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'disposition_delay_reason_type'
    ) INTO type_exists;

    IF NOT type_exists THEN
        -- Fresh install: create with all 7 values directly
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
        -- Type exists from migration 011. Check if new values are already present.
        SELECT EXISTS (
            SELECT 1
            FROM   pg_enum  e
            JOIN   pg_type  t ON e.enumtypid = t.oid
            WHERE  t.typname  = 'disposition_delay_reason_type'
            AND    e.enumlabel = 'no_icu_bed'
        ) INTO values_added;

        IF NOT values_added THEN
            -- Rename → recreate with all 7 values → migrate column → drop old
            -- (the only transaction-safe way to extend an existing enum)
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
END $$;

-- Down Migration
DO $$
DECLARE
    old_exists boolean;
BEGIN
    -- Only roll back if the new values are present
    SELECT EXISTS (
        SELECT 1
        FROM   pg_enum  e
        JOIN   pg_type  t ON e.enumtypid = t.oid
        WHERE  t.typname  = 'disposition_delay_reason_type'
        AND    e.enumlabel = 'no_icu_bed'
    ) INTO old_exists;

    IF old_exists THEN
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
