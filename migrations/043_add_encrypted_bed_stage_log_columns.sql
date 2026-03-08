-- Migration 043: Add Encrypted Bed Stage Log Columns
-- Purpose: US-18 - Data Encryption & Sensitive Data Protection
-- Phase: 4 - Database Migration
--
-- Adds JSONB columns for storing encrypted clinical notes and operational data
--
-- Sensitive fields encrypted:
-- • clinical_notes: Clinical observations and patient status (PHI)
-- • delay_reason_notes: Reasons for delays (operational data, low-medium risk)
--
-- Notes are often searched but we'll encrypt for HIPAA compliance
-- Search capability will be limited after encryption (GDPR compliant)

ALTER TABLE bed_stage_logs
ADD COLUMN IF NOT EXISTS clinical_notes_encrypted JSONB,
ADD COLUMN IF NOT EXISTS delay_reason_notes_encrypted JSONB;

-- Add metadata tracking
ALTER TABLE bed_stage_logs
ADD COLUMN IF NOT EXISTS encryption_status VARCHAR(50) DEFAULT 'pending'
    CHECK (encryption_status IN ('pending', 'encrypted', 'partial', 'failed'));

ALTER TABLE bed_stage_logs
ADD COLUMN IF NOT EXISTS encrypted_at TIMESTAMP WITH TIME ZONE;

-- Indexes for non-sensitive queries
CREATE INDEX IF NOT EXISTS idx_bed_stage_logs_encryption_status
    ON bed_stage_logs(encryption_status);

CREATE INDEX IF NOT EXISTS idx_bed_stage_logs_encrypted_at
    ON bed_stage_logs(encrypted_at DESC)
    WHERE encryption_status = 'encrypted';

-- Comments
COMMENT ON COLUMN bed_stage_logs.clinical_notes_encrypted IS 
    'Encrypted clinical notes (PHI, AES-256-GCM). JSON: { data, tag, iv, kv }';
COMMENT ON COLUMN bed_stage_logs.delay_reason_notes_encrypted IS 
    'Encrypted delay reason notes (operational, AES-256-GCM). JSON: { data, tag, iv, kv }';
COMMENT ON COLUMN bed_stage_logs.encryption_status IS 
    'Status: pending, encrypted, partial, failed';
COMMENT ON COLUMN bed_stage_logs.encrypted_at IS 
    'When notes were last encrypted';

-- Security notes:
-- • Original notes columns will remain temporarily for backward compatibility
-- • Audit trail of stage transitions remains unencrypted (transition_time, user_id, etc.)
-- • Only free-text notes fields encrypted per HIPAA requirements
-- • bed_id, from_stage_id, to_stage_id remain plaintext (operational metadata)
