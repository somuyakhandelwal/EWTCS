-- Migration 047: Add Doctor and Cardiologist Roles
-- Purpose: EPIC 20 - ER Triage & Patient Intake
-- Adds new user roles for doctors and cardiologists to manage clinical functions

-- Up Migration
DO $$
BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'doctor';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'cardiologist';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Comments
COMMENT ON COLUMN users.role IS 
    'User role: nurse, supervisor, admin, housekeeping, auditor, doctor, cardiologist';

-- Down Migration
-- PostgreSQL enums cannot safely remove values once added without type recreation.
-- Intentionally no-op - values remain in enum.
SELECT 1;

