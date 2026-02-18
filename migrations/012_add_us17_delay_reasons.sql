-- Migration 012: Expand disposition delay reasons (US-1.7)
-- Purpose: Add 'no_icu_bed' and 'no_general_ward_bed' enum values
-- Idempotent: works whether migration 011 ran before it or not.
-- Uses EXECUTE inside DO $$ so all DDL runs in the same catalog snapshot.

DO $$
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
