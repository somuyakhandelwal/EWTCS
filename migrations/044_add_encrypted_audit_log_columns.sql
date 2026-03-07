-- Migration 044: Add Encrypted Audit Log Columns
-- Purpose: US-18 - Data Encryption & Sensitive Data Protection
-- Phase: 4 - Database Migration
--
-- Adds JSONB column for storing encrypted IP addresses and action details
--
-- Sensitive fields encrypted:
-- • ip_address: Original plaintext IP stored in column (INET type)
-- • action_details: Detailed action information (from metadata or changes JSON)
--
-- Notes:
-- • ip_address already exists as INET type (not searchable post-encryption)
-- • We add ip_address_encrypted to store encrypted version
-- • Audit logs are append-only (immutable, cannot be updated/deleted)
-- • Perfect for encryption (one-time write, many reads)

ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS ip_address_encrypted JSONB,
ADD COLUMN IF NOT EXISTS action_details_encrypted JSONB;

-- Add metadata tracking
ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS encryption_status VARCHAR(50) DEFAULT 'pending'
    CHECK (encryption_status IN ('pending', 'encrypted', 'partial', 'failed'));

ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS encrypted_at TIMESTAMP WITH TIME ZONE;

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_encryption_status
    ON audit_logs(encryption_status);

-- Index on encrypted audit logs (created_at still works for time-range queries)
CREATE INDEX IF NOT EXISTS idx_audit_logs_encrypted_at
    ON audit_logs(encrypted_at DESC)
    WHERE encryption_status = 'encrypted';

-- Comments
COMMENT ON COLUMN audit_logs.ip_address_encrypted IS 
    'Encrypted IP address (AES-256-GCM). JSON: { data, tag, iv, kv }';
COMMENT ON COLUMN audit_logs.action_details_encrypted IS 
    'Encrypted action details (AES-256-GCM). JSON: { data, tag, iv, kv }';
COMMENT ON COLUMN audit_logs.encryption_status IS 
    'Status: pending=not encrypted, encrypted=done, failed=error';
COMMENT ON COLUMN audit_logs.encrypted_at IS 
    'When this audit log record was encrypted';

-- Immutability guarantees:
-- • Trigger prevent_audit_logs_mutation() prevents UPDATE/DELETE
-- • Once encrypted, data cannot be modified
-- • Perfect for GDPR right-to-be-forgotten with data retention requirements
-- • Encrypted data cannot be decrypted by unauthorized users even if database is breached

-- Note: Keep original ip_address column for backward compatibility
-- Once all reads migrated to encrypted_ip_address, can drop original
