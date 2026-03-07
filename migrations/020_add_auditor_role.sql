-- Migration 020: Add 'auditor' read-only role
-- US-12.3: Provide read-only audit mode with dedicated auditor role

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'auditor';
