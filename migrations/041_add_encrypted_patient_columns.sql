-- Migration 041: Add Encrypted Patient Admission Columns
-- Purpose: US-18 - Data Encryption & Sensitive Data Protection
-- Phase: 4 - Database Migration
--
-- Adds JSONB columns for storing encrypted PII and PHI
-- Each column stores: { data: string, tag: string, iv: string, kv: number }
--
-- Migration Strategy (zero-downtime):
-- 1. Add new encrypted_* columns as nullable
-- 2. Application starts using encrypted versions (writes to both for transition)
-- 3. In Phase 5: Application begins reading from encrypted columns
-- 4. Later: Drop old plaintext columns after confirmation
--
-- Rationale:
-- • JSONB type allows flexible encryption metadata storage
-- • Nullable during transition period
-- • Indexes on created_at still work for analytics
-- • No data loss during gradual migration

-- Add encrypted PII/PHI columns to patient_admissions
ALTER TABLE patient_admissions
ADD COLUMN IF NOT EXISTS patient_name_encrypted JSONB,
ADD COLUMN IF NOT EXISTS patient_contact_encrypted JSONB,
ADD COLUMN IF NOT EXISTS medical_record_id_encrypted JSONB,
ADD COLUMN IF NOT EXISTS admission_diagnosis_encrypted JSONB;

-- Add metadata tracking column
ALTER TABLE patient_admissions
ADD COLUMN IF NOT EXISTS encryption_status VARCHAR(50) DEFAULT 'pending'
    CHECK (encryption_status IN ('pending', 'encrypted', 'partial', 'failed'));

ALTER TABLE patient_admissions
ADD COLUMN IF NOT EXISTS encrypted_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for queries on encrypted data (future use)
-- Note: Can't search encrypted data directly, but can index updated_at for performance
CREATE INDEX IF NOT EXISTS idx_patient_admissions_encrypted_at
    ON patient_admissions(encrypted_at DESC)
    WHERE encryption_status = 'encrypted';

CREATE INDEX IF NOT EXISTS idx_patient_admissions_encryption_status
    ON patient_admissions(encryption_status);

-- Comments for documentation
COMMENT ON COLUMN patient_admissions.patient_name_encrypted IS 
    'Encrypted patient name (AES-256-GCM). JSON: { data, tag, iv, kv }';
COMMENT ON COLUMN patient_admissions.patient_contact_encrypted IS 
    'Encrypted patient contact info (AES-256-GCM). JSON: { data, tag, iv, kv }';
COMMENT ON COLUMN patient_admissions.medical_record_id_encrypted IS 
    'Encrypted medical record ID (AES-256-GCM). JSON: { data, tag, iv, kv }';
COMMENT ON COLUMN patient_admissions.admission_diagnosis_encrypted IS 
    'Encrypted admission diagnosis (AES-256-GCM). JSON: { data, tag, iv, kv }';
COMMENT ON COLUMN patient_admissions.encryption_status IS 
    'Status of encryption job: pending=scheduled, encrypted=complete, failed=error occurred';
COMMENT ON COLUMN patient_admissions.encrypted_at IS 
    'When this record was last encrypted';

-- Security note: These columns store encrypted data
-- Access control is enforced at application layer, not database
