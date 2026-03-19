-- Migration 050: Create OT Procedures Table
-- Purpose: EPIC 20 - ER Triage & Patient Intake (US-20.3)
-- Stores: Surgical procedures in Operating Theatre with detailed tracking
-- Acceptance Criteria 3: New ot_procedures table with OT tracking and status

-- Up Migration

-- Self-heal for databases where 045_create_ot_rooms was marked applied but rolled back.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'ot_room_status'
    ) THEN
        CREATE TYPE ot_room_status AS ENUM ('available', 'ongoing');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS ot_rooms (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_number   TEXT NOT NULL UNIQUE,
    status        ot_room_status NOT NULL DEFAULT 'available',
    started_at    TIMESTAMP WITH TIME ZONE,
    updated_by    UUID REFERENCES users(id),
    updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ot_rooms_status ON ot_rooms(status);

INSERT INTO ot_rooms (room_number, status) VALUES
    ('OT-01', 'available'), ('OT-02', 'available'),
    ('OT-03', 'available'), ('OT-04', 'available'),
    ('OT-05', 'available'), ('OT-06', 'available'),
    ('OT-07', 'available'), ('OT-08', 'available'),
    ('OT-09', 'available'), ('OT-10', 'available'),
    ('OT-11', 'available'), ('OT-12', 'available'),
    ('OT-13', 'available'), ('OT-14', 'available'),
    ('OT-15', 'available'), ('OT-16', 'available')
ON CONFLICT (room_number) DO NOTHING;

CREATE TABLE IF NOT EXISTS ot_procedures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Operating theatre and patient identification
    ot_id UUID NOT NULL REFERENCES ot_rooms(id) ON DELETE RESTRICT,
    bed_id UUID REFERENCES beds(id) ON DELETE SET NULL,
    patient_uhid VARCHAR(100),
    
    -- Procedure details
    procedure_name VARCHAR(100) NOT NULL,
    procedure_code VARCHAR(20),  -- ICD-9 procedure code
    
    -- Clinical team
    surgeon_id UUID NOT NULL REFERENCES users(id),
    anesthetist_id UUID REFERENCES users(id),
    
    -- Scheduling and timing
    scheduled_start TIMESTAMP WITH TIME ZONE,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_finish_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,  -- Calculated: (actual_finish_time - actual_start_time) / 60
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED' 
        CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    
    -- Clinical outcomes (plaintext and encrypted versions)
    outcome TEXT,
    outcome_encrypted JSONB,
    
    complications TEXT,
    complications_encrypted JSONB,
    
    clinical_notes TEXT,
    clinical_notes_encrypted JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ot_procedures_ot_id ON ot_procedures(ot_id);
CREATE INDEX IF NOT EXISTS idx_ot_procedures_status ON ot_procedures(status);
CREATE INDEX IF NOT EXISTS idx_ot_procedures_bed_id ON ot_procedures(bed_id);
CREATE INDEX IF NOT EXISTS idx_ot_procedures_patient_uhid ON ot_procedures(patient_uhid);
CREATE INDEX IF NOT EXISTS idx_ot_procedures_surgeon_id ON ot_procedures(surgeon_id);
CREATE INDEX IF NOT EXISTS idx_ot_procedures_scheduled_start ON ot_procedures(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_ot_procedures_actual_start_time ON ot_procedures(actual_start_time DESC);

-- Composite index for OT scheduling (find available rooms and time slots)
CREATE INDEX IF NOT EXISTS idx_ot_procedures_ot_status_start 
    ON ot_procedures(ot_id, status, actual_start_time);

-- Comments for documentation
COMMENT ON TABLE ot_procedures IS 
    'Operating Theatre procedure tracking - surgical procedures with timing, team, and outcomes';
COMMENT ON COLUMN ot_procedures.ot_id IS 
    'Reference to ot_rooms table - which operating theatre this procedure uses';
COMMENT ON COLUMN ot_procedures.surgeon_id IS 
    'Primary surgeon performing the procedure (users.id, typically role="doctor")';
COMMENT ON COLUMN ot_procedures.anesthetist_id IS 
    'Anesthetist managing anesthesia (nullable if not applicable, users.id)';
COMMENT ON COLUMN ot_procedures.status IS 
    'Procedure status: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED';
COMMENT ON COLUMN ot_procedures.outcome IS 
    'Procedure outcome description (plaintext - will migrate to encrypted)';
COMMENT ON COLUMN ot_procedures.outcome_encrypted IS 
    'Encrypted procedure outcome (AES-256-GCM, PHI). JSON: { data, tag, iv, kv }';
COMMENT ON COLUMN ot_procedures.complications IS 
    'Any complications during procedure (plaintext - will migrate to encrypted)';
COMMENT ON COLUMN ot_procedures.complications_encrypted IS 
    'Encrypted complications data (AES-256-GCM, PHI). JSON: { data, tag, iv, kv }';
COMMENT ON COLUMN ot_procedures.clinical_notes IS 
    'Additional clinical notes (plaintext - will migrate to encrypted)';
COMMENT ON COLUMN ot_procedures.clinical_notes_encrypted IS 
    'Encrypted clinical notes (AES-256-GCM, PHI). JSON: { data, tag, iv, kv }';
COMMENT ON COLUMN ot_procedures.duration_minutes IS 
    'Calculated procedure duration in minutes (from start to finish time)';

-- Down Migration
-- DROP TABLE IF EXISTS ot_procedures;

