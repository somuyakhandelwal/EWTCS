-- Migration 012: Expand disposition delay reasons (US-1.7)
-- Purpose: Add 'no_icu_bed' and 'no_general_ward_bed' enum values
-- to match acceptance criteria for US-1.7 Display Reason for Delay
--
-- ALTER TYPE ADD VALUE cannot run inside a transaction block (even inside DO $$).
-- The safe transactional approach is to rename the old type, create a new one
-- with all values, migrate the column, then drop the old type.

-- Step 1: Rename the existing enum to a temporary name
ALTER TYPE disposition_delay_reason_type RENAME TO disposition_delay_reason_type_old;

-- Step 2: Create the new enum with all 7 values (original 5 + 2 new)
CREATE TYPE disposition_delay_reason_type AS ENUM (
    'no_bed_upstairs',
    'awaiting_transport',
    'family_consent',
    'awaiting_specialist',
    'other',
    'no_icu_bed',
    'no_general_ward_bed'
);

-- Step 3: Migrate the column to the new type
ALTER TABLE disposition_delay_reasons
    ALTER COLUMN reason TYPE disposition_delay_reason_type
    USING reason::text::disposition_delay_reason_type;

-- Step 4: Drop the old enum
DROP TYPE disposition_delay_reason_type_old;

-- Down Migration
-- Reverse: rename new back to old, recreate original 5-value enum, migrate, drop new

ALTER TYPE disposition_delay_reason_type RENAME TO disposition_delay_reason_type_new;

CREATE TYPE disposition_delay_reason_type AS ENUM (
    'no_bed_upstairs',
    'awaiting_transport',
    'family_consent',
    'awaiting_specialist',
    'other'
);

ALTER TABLE disposition_delay_reasons
    ALTER COLUMN reason TYPE disposition_delay_reason_type
    USING reason::text::disposition_delay_reason_type;

DROP TYPE disposition_delay_reason_type_new;
