-- Migration 015: Add housekeeping role
-- Purpose: Allow housekeeping staff login with limited permissions for cleaning workflow

-- Up Migration
DO $$
BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'housekeeping';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Down Migration
-- PostgreSQL enums cannot safely remove values once added without type recreation.
-- Intentionally no-op.
SELECT 1;
