-- Migration 042: Add Encrypted User Columns
-- Purpose: US-18 - Data Encryption & Sensitive Data Protection
-- Phase: 4 - Database Migration
--
-- Adds JSONB columns for storing encrypted user PII
-- Passwords remain bcrypt (not AES-256) as they cannot be decrypted
--
-- Sensitive fields encrypted:
-- • email: User email address (PII)
-- • full_name: User full name (PII)
--
-- Strategy:
-- 1. Add new encrypted_* columns as nullable
-- 2. Gradual migration of existing user data
-- 3. Application handles both encrypted and plaintext during transition
-- 4. Eventually drop old plaintext columns

ALTER TABLE users
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_encrypted JSONB,
ADD COLUMN IF NOT EXISTS full_name_encrypted JSONB;

-- Add metadata tracking
ALTER TABLE users
ADD COLUMN IF NOT EXISTS encryption_status VARCHAR(50) DEFAULT 'pending'
    CHECK (encryption_status IN ('pending', 'encrypted', 'partial', 'failed'));

ALTER TABLE users
ADD COLUMN IF NOT EXISTS encrypted_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for lookups (email is often used for login)
CREATE INDEX IF NOT EXISTS idx_users_email
    ON users(email)
    WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_encryption_status
    ON users(encryption_status);

-- Comments
COMMENT ON COLUMN users.email IS 
    'User email address (will be encrypted and moved to email_encrypted)';
COMMENT ON COLUMN users.full_name IS 
    'User full name (will be encrypted and moved to full_name_encrypted)';
COMMENT ON COLUMN users.email_encrypted IS 
    'Encrypted email address (AES-256-GCM). JSON: { data, tag, iv, kv }';
COMMENT ON COLUMN users.full_name_encrypted IS 
    'Encrypted full name (AES-256-GCM). JSON: { data, tag, iv, kv }';
COMMENT ON COLUMN users.encryption_status IS 
    'Status: pending=not encrypted, encrypted=complete, failed=error';
COMMENT ON COLUMN users.encrypted_at IS 
    'When user data was last encrypted';

-- Security notes:
-- • password_hash is NOT encrypted (bcrypt hashes cannot be decrypted)
-- • username remains plaintext (used for authentication, immutable)
-- • email/full_name moved to encrypted columns per GDPR/HIPAA requirements
