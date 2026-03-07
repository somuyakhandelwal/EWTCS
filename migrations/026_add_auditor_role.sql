-- Migration 015: Add Auditor User Role
-- Purpose: Support EPIC 12 read-only auditor persona for compliance history review

DO $$
BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'auditor';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
