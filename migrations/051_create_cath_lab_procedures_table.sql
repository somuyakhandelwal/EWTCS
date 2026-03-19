-- Migration 051: Create Cath Lab Procedures Table
-- Purpose: EPIC 20 - ER Triage & Patient Intake (US-20.4)
-- Stores: Cardiac catheterization procedures with diagnostic and intervention data
-- Acceptance Criteria 4: New cath_lab_procedures table with cardiologist and outcomes

-- Up Migration

CREATE TABLE IF NOT EXISTS cath_lab_procedures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Patient identification
    bed_id UUID REFERENCES beds(id) ON DELETE SET NULL,
    patient_uhid VARCHAR(100),
    
    -- Cardiologist performing procedure
    cardiologist_id UUID NOT NULL REFERENCES users(id),
    
    -- Procedure type and classification
    procedure_type VARCHAR(100) NOT NULL,
    procedure_code VARCHAR(20),  -- ICD-9 or other standardized code
    
    -- Clinical indications (plaintext and encrypted versions)
    clinical_indication TEXT,
    clinical_indication_encrypted JSONB,
    
    -- Scheduling and timing
    scheduled_start TIMESTAMP WITH TIME ZONE,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes >= 0),  -- Calculated: (actual_end_time - actual_start_time) / 60
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED'
        CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    
    -- Diagnostic findings
    findings TEXT,
    findings_encrypted JSONB,
    
    -- Interventions performed
    interventions_performed TEXT,
    interventions_performed_encrypted JSONB,
    
    -- Stenosis/pathology details (cardiac-specific)
    stenosis_location VARCHAR(100),
    stenosis_location_encrypted JSONB,
    stenosis_percentage INTEGER CHECK (stenosis_percentage IS NULL OR (stenosis_percentage BETWEEN 0 AND 100)),
    stenosis_percentage_encrypted JSONB,
    
    -- Overall outcome and complications
    outcome TEXT,
    outcome_encrypted JSONB,
    
    complications TEXT,
    complications_encrypted JSONB,
    
    -- Additional clinical notes
    clinical_notes TEXT,
    clinical_notes_encrypted JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Timeline validation
    CONSTRAINT chk_cath_lab_procedures_time_order
        CHECK (actual_end_time IS NULL OR actual_start_time IS NULL OR actual_end_time >= actual_start_time)
);

-- Safety repair for environments where a partial table existed before this migration
ALTER TABLE IF EXISTS cath_lab_procedures
    ADD COLUMN IF NOT EXISTS id UUID,
    ADD COLUMN IF NOT EXISTS bed_id UUID,
    ADD COLUMN IF NOT EXISTS patient_uhid VARCHAR(100),
    ADD COLUMN IF NOT EXISTS cardiologist_id UUID,
    ADD COLUMN IF NOT EXISTS procedure_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS procedure_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS clinical_indication TEXT,
    ADD COLUMN IF NOT EXISTS clinical_indication_encrypted JSONB,
    ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS actual_start_time TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS actual_end_time TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS findings TEXT,
    ADD COLUMN IF NOT EXISTS findings_encrypted JSONB,
    ADD COLUMN IF NOT EXISTS interventions_performed TEXT,
    ADD COLUMN IF NOT EXISTS interventions_performed_encrypted JSONB,
    ADD COLUMN IF NOT EXISTS stenosis_location VARCHAR(100),
    ADD COLUMN IF NOT EXISTS stenosis_location_encrypted JSONB,
    ADD COLUMN IF NOT EXISTS stenosis_percentage INTEGER,
    ADD COLUMN IF NOT EXISTS stenosis_percentage_encrypted JSONB,
    ADD COLUMN IF NOT EXISTS outcome TEXT,
    ADD COLUMN IF NOT EXISTS outcome_encrypted JSONB,
    ADD COLUMN IF NOT EXISTS complications TEXT,
    ADD COLUMN IF NOT EXISTS complications_encrypted JSONB,
    ADD COLUMN IF NOT EXISTS clinical_notes TEXT,
    ADD COLUMN IF NOT EXISTS clinical_notes_encrypted JSONB,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE cath_lab_procedures
    ALTER COLUMN id SET DEFAULT uuid_generate_v4(),
    ALTER COLUMN status SET DEFAULT 'SCHEDULED',
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND t.relname = 'cath_lab_procedures'
          AND c.contype = 'f'
          AND pg_get_constraintdef(c.oid) LIKE 'FOREIGN KEY (bed_id)%REFERENCES beds(id)%'
    ) THEN
        ALTER TABLE cath_lab_procedures
            ADD CONSTRAINT fk_cath_lab_procedures_bed_id
            FOREIGN KEY (bed_id) REFERENCES beds(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND t.relname = 'cath_lab_procedures'
          AND c.contype = 'f'
          AND pg_get_constraintdef(c.oid) LIKE 'FOREIGN KEY (cardiologist_id)%REFERENCES users(id)%'
    ) THEN
        ALTER TABLE cath_lab_procedures
            ADD CONSTRAINT fk_cath_lab_procedures_cardiologist_id
            FOREIGN KEY (cardiologist_id) REFERENCES users(id);
    END IF;
END $$;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_bed_id ON cath_lab_procedures(bed_id);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_patient_uhid ON cath_lab_procedures(patient_uhid);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_cardiologist_id ON cath_lab_procedures(cardiologist_id);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_status ON cath_lab_procedures(status);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_scheduled_start ON cath_lab_procedures(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_actual_start_time ON cath_lab_procedures(actual_start_time DESC);
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_procedure_type ON cath_lab_procedures(procedure_type);

-- Composite index for procedure timeline queries
CREATE INDEX IF NOT EXISTS idx_cath_lab_procedures_cardiologist_date 
    ON cath_lab_procedures(cardiologist_id, actual_start_time DESC);

-- Comments for documentation
COMMENT ON TABLE cath_lab_procedures IS 
    'Cardiac catheterization lab procedures - diagnostic and interventional cardiology procedures';
COMMENT ON COLUMN cath_lab_procedures.cardiologist_id IS 
    'Cardiologist performing the procedure (users.id, typically role="cardiologist")';
COMMENT ON COLUMN cath_lab_procedures.procedure_type IS 
    'Type of cath procedure: coronary angiography, intervention, electrophysiology, etc.';
COMMENT ON COLUMN cath_lab_procedures.clinical_indication IS 
    'Clinical reason for the procedure (plaintext - will migrate to encrypted)';
COMMENT ON COLUMN cath_lab_procedures.clinical_indication_encrypted IS 
    'Encrypted clinical indication (AES-256-GCM, PHI). JSON: { data, tag, iv, kv }';
COMMENT ON COLUMN cath_lab_procedures.findings IS 
    'Diagnostic findings from procedure (plaintext - will migrate to encrypted)';
COMMENT ON COLUMN cath_lab_procedures.findings_encrypted IS 
    'Encrypted findings (AES-256-GCM, PHI). JSON: { data, tag, iv, kv }';
COMMENT ON COLUMN cath_lab_procedures.interventions_performed IS 
    'Description of interventions performed (plaintext - will migrate to encrypted)';
COMMENT ON COLUMN cath_lab_procedures.interventions_performed_encrypted IS 
    'Encrypted interventions (AES-256-GCM, PHI). JSON: { data, tag, iv, kv }';
COMMENT ON COLUMN cath_lab_procedures.stenosis_location IS 
    'Location of stenosis if found (e.g., LAD, LCx, RCA) (plaintext - will migrate to encrypted)';
COMMENT ON COLUMN cath_lab_procedures.stenosis_location_encrypted IS 
    'Encrypted stenosis location (AES-256-GCM, PHI). JSON: { data, tag, iv, kv }';
COMMENT ON COLUMN cath_lab_procedures.stenosis_percentage IS 
    'Degree of stenosis (0-100%) if present (plaintext - will migrate to encrypted)';
COMMENT ON COLUMN cath_lab_procedures.stenosis_percentage_encrypted IS 
    'Encrypted stenosis percentage (AES-256-GCM, PHI). JSON: { data, tag, iv, kv }';
COMMENT ON COLUMN cath_lab_procedures.outcome IS 
    'Procedure outcome (plaintext - will migrate to encrypted)';
COMMENT ON COLUMN cath_lab_procedures.outcome_encrypted IS 
    'Encrypted outcome (AES-256-GCM, PHI). JSON: { data, tag, iv, kv }';
COMMENT ON COLUMN cath_lab_procedures.complications IS 
    'Any complications during procedure (plaintext - will migrate to encrypted)';
COMMENT ON COLUMN cath_lab_procedures.complications_encrypted IS 
    'Encrypted complications (AES-256-GCM, PHI). JSON: { data, tag, iv, kv }';
COMMENT ON COLUMN cath_lab_procedures.duration_minutes IS 
    'Calculated procedure duration in minutes (from start to end time)';
COMMENT ON COLUMN cath_lab_procedures.status IS 
    'Procedure status: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED';

-- Down Migration
-- DROP TABLE IF EXISTS cath_lab_procedures;