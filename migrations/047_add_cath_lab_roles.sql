-- Migration 047: Add cath lab roles for US-24.1
-- Purpose: Enable dedicated cath lab user personas in RBAC and user management.

DO $$
BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'cardiologist';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'cath_lab_nurse';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
