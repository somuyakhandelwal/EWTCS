-- Migration 048: Create ER Intake Table
-- Purpose: EPIC 20 - ER Triage & Patient Intake (US-20.1)
-- Stores: Patient arrival details, chief complaint, triage level, vital signs
-- Acceptance Criteria 1: New er_intake table with proper fields and constraints

-- Up Migration

CREATE TABLE IF NOT EXISTS er_intake (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Patient identification and location
    bed_id UUID REFERENCES beds(id) ON DELETE CASCADE,
    patient_uhid VARCHAR(100),
    
    -- Chief complaint and triage
    symptom VARCHAR(40) NOT NULL,
    complaint TEXT,
    complaint_encrypted JSONB,
    triage_level VARCHAR(20) NOT NULL CHECK (triage_level IN ('URGENT', 'HIGH', 'MEDIUM', 'LOW')),
    
    -- Vital signs (flexible JSON storage for variations)
    vital_signs JSONB,
    vital_signs_encrypted JSONB,
    
    -- Who created this record
    registered_by_user_id UUID NOT NULL REFERENCES users(id),
    
    -- Timestamps
    registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_er_intake_bed_id ON er_intake(bed_id);
CREATE INDEX IF NOT EXISTS idx_er_intake_patient_uhid ON er_intake(patient_uhid);
CREATE INDEX IF NOT EXISTS idx_er_intake_triage_level ON er_intake(triage_level);
CREATE INDEX IF NOT EXISTS idx_er_intake_registered_at ON er_intake(registered_at DESC);
CREATE INDEX IF NOT EXISTS idx_er_intake_registered_by ON er_intake(registered_by_user_id);

-- Comments for documentation
COMMENT ON TABLE er_intake IS 
    'Emergency Room intake records - patient arrival, chief complaint, initial triage assessment';
COMMENT ON COLUMN er_intake.symptom IS 
    'Chief complaint/symptom at arrival (max 40 chars, plaintext for quick reference)';
COMMENT ON COLUMN er_intake.complaint IS 
    'Detailed complaint description (plaintext - will be migrated to encrypted column)';
COMMENT ON COLUMN er_intake.complaint_encrypted IS 
    'Encrypted detailed complaint (AES-256-GCM, PHI). JSON: { data, tag, iv, kv }';
COMMENT ON COLUMN er_intake.triage_level IS 
    'Initial triage level: URGENT (red), HIGH (orange), MEDIUM (yellow), LOW (green)';
COMMENT ON COLUMN er_intake.vital_signs IS 
    'Vital signs as JSON: { bp, hr, temperature, respiratory_rate, oxygen_saturation }';
COMMENT ON COLUMN er_intake.vital_signs_encrypted IS 
    'Encrypted vital signs (AES-256-GCM, PHI). JSON: { data, tag, iv, kv }';
COMMENT ON COLUMN er_intake.registered_by_user_id IS 
    'User who created this intake record (typically triage nurse)';
COMMENT ON COLUMN er_intake.registered_at IS 
    'When patient was registered/triaged (from intake staff perspective)';

-- Down Migration
-- DROP TABLE IF EXISTS er_intake;

