-- Migration 012: Expand disposition delay reasons (US-1.7)
-- Purpose: Add 'no_icu_bed' and 'no_general_ward_bed' enum values
-- to match acceptance criteria for US-1.7 Display Reason for Delay

-- PostgreSQL allows adding new values to an existing enum non-destructively.
-- These additions are permanent (enums cannot have values removed without full
-- type recreation), which is acceptable here as these are additive labels.

ALTER TYPE disposition_delay_reason_type ADD VALUE IF NOT EXISTS 'no_icu_bed';
ALTER TYPE disposition_delay_reason_type ADD VALUE IF NOT EXISTS 'no_general_ward_bed';

-- Down Migration
-- NOTE: ALTER TYPE ADD VALUE cannot be reversed in PostgreSQL without full type
-- recreation. The values are left in place as they are non-breaking additions.
SELECT 1; -- no-op: enum value removal is intentionally unsupported
