-- Migration 012: Expand disposition delay reasons (US-1.7)
-- Purpose: Add 'no_icu_bed' and 'no_general_ward_bed' enum values
-- to match acceptance criteria for US-1.7 Display Reason for Delay

-- Use DO $$ blocks so these run safely inside --single-transaction mode.
-- ALTER TYPE ADD VALUE cannot be called directly inside a transaction block
-- in PostgreSQL, but wrapping in a PL/pgSQL DO block bypasses this restriction.

DO $$ BEGIN
    ALTER TYPE disposition_delay_reason_type ADD VALUE IF NOT EXISTS 'no_icu_bed';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE disposition_delay_reason_type ADD VALUE IF NOT EXISTS 'no_general_ward_bed';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Down Migration
-- ALTER TYPE ADD VALUE cannot be reversed in PostgreSQL without recreating the
-- entire type. These values are left in place as they are non-breaking additions.
SELECT 1; -- no-op: enum value removal is intentionally unsupported
