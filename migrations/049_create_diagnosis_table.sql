-- Migration 049: Create Diagnosis Table
-- Purpose: EPIC 20 - ER Triage & Patient Intake (US-20.2)
-- Stores: Doctor assessments, diagnoses, clinical findings
-- Acceptance Criteria 2: New diagnosis table with doctor_id and clinical data

-- Up Migration

CREATE TABLE IF NOT EXISTS diagnosis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Patient identification
    bed_id UUID REFERENCES beds(id) ON DELETE CASCADE,
    patient_uhid VARCHAR(100),
    
    -- Doctor who made diagnosis
    doctor_id UUID NOT NULL REFERENCES users(id),
    
    -- Clinical observations (plaintext and encrypted versions)
    symptoms_observed TEXT,
    symptoms_observed_encrypted JSONB,
    
    clinical_findings TEXT,
    clinical_findings_encrypted JSONB,
    
    -- Diagnosis information
    diagnosis_code VARCHAR(20),  -- ICD-10 or similar coding system
    diagnosis_text TEXT,
    diagnosis_text_encrypted JSONB,
    
    -- Severity assessment
    severity VARCHAR(20) CHECK (severity IN ('MILD', 'MODERATE', 'SEVERE', 'CRITICAL')),
    
    -- Recommended next steps
    recommended_action TEXT,
    recommended_action_encrypted JSONB,
    
    -- Timestamps
    diagnosed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_diagnosis_bed_id ON diagnosis(bed_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_patient_uhid ON diagnosis(patient_uhid);
CREATE INDEX IF NOT EXISTS idx_diagnosis_doctor_id ON diagnosis(doctor_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_diagnosed_at ON diagnosis(diagnosed_at DESC);
CREATE INDEX IF NOT EXISTS idx_diagnosis_severity ON diagnosis(severity);

-- Comments for documentation
COMMENT ON TABLE diagnosis IS 
    'Doctor diagnoses and clinical assessments - records complete diagnostic evaluation by doctor';
COMMENT ON COLUMN diagnosis.doctor_id IS 
    'Users.id of the doctor making the diagnosis (user.role = "doctor")';
COMMENT ON COLUMN diagnosis.symptoms_observed IS 
    'Symptoms observed during examination (plaintext - will migrate to encrypted)';
COMMENT ON COLUMN diagnosis.symptoms_observed_encrypted IS 
    'Encrypted symptoms observed (AES-256-GCM, PHI). JSON: { data, tag, iv, kv }';
COMMENT ON COLUMN diagnosis.clinical_findings IS 
    'Clinical examination findings (plaintext - will migrate to encrypted)';
COMMENT ON COLUMN diagnosis.clinical_findings_encrypted IS 
    'Encrypted clinical findings (AES-256-GCM, PHI). JSON: { data, tag, iv, kv }';
COMMENT ON COLUMN diagnosis.diagnosis_code IS 
    'Standardized diagnosis code (ICD-10, SNOMED CT, etc.)';
COMMENT ON COLUMN diagnosis.diagnosis_text IS 
    'Diagnosis description in plain text (plaintext - will migrate to encrypted)';
COMMENT ON COLUMN diagnosis.diagnosis_text_encrypted IS 
    'Encrypted diagnosis (AES-256-GCM, PHI). JSON: { data, tag, iv, kv }';
COMMENT ON COLUMN diagnosis.severity IS 
    'Clinical severity: MILD, MODERATE, SEVERE, CRITICAL';
COMMENT ON COLUMN diagnosis.recommended_action IS 
    'Recommended next clinical action (plaintext - will migrate to encrypted)';
COMMENT ON COLUMN diagnosis.recommended_action_encrypted IS 
    'Encrypted recommended action (AES-256-GCM, PHI). JSON: { data, tag, iv, kv }';
COMMENT ON COLUMN diagnosis.diagnosed_at IS 
    'Timestamp when diagnosis was made';

-- Down Migration
-- DROP TABLE IF EXISTS diagnosis;

