-- Migration 012: Expand disposition delay reasons (US-1.7)
-- Purpose: Add 'no_icu_bed' and 'no_general_ward_bed' enum values
-- to match acceptance criteria for US-1.7 Display Reason for Delay

-- PostgreSQL allows adding new values to an existing enum non-destructively.
-- These additions are permanent (enums cannot have values removed without full
-- type recreation), which is acceptable here as these are additive labels.

ALTER TYPE disposition_delay_reason_type ADD VALUE IF NOT EXISTS 'no_icu_bed';
ALTER TYPE disposition_delay_reason_type ADD VALUE IF NOT EXISTS 'no_general_ward_bed';

-- Down Migration (cannot truly undo ALTER TYPE ADD VALUE in PostgreSQL;
-- a full type recreation would be needed, which is intentionally omitted here
-- as removing enum values is destructive and not required for a rollback).
