-- Migration 005: Create Beds and Stages Tables
-- Purpose: Core tables for emergency ward bed tracking and stage management
-- Epic: EPIC 1 - Nurse Desk Bed Dashboard

-- Create stages table (patient workflow stages)
CREATE TABLE IF NOT EXISTS stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_order INTEGER NOT NULL UNIQUE,
    color_code VARCHAR(20) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on display_order for efficient ordering
CREATE INDEX IF NOT EXISTS idx_stages_display_order ON stages(display_order);
CREATE INDEX IF NOT EXISTS idx_stages_active ON stages(is_active);

-- Create beds table
CREATE TABLE IF NOT EXISTS beds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bed_number VARCHAR(50) NOT NULL UNIQUE,
    current_stage_id UUID REFERENCES stages(id),
    patient_start_time TIMESTAMP WITH TIME ZONE,
    last_stage_change TIMESTAMP WITH TIME ZONE,
    is_occupied BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for beds
CREATE INDEX IF NOT EXISTS idx_beds_bed_number ON beds(bed_number);
CREATE INDEX IF NOT EXISTS idx_beds_occupied ON beds(is_occupied);
CREATE INDEX IF NOT EXISTS idx_beds_stage ON beds(current_stage_id);
CREATE INDEX IF NOT EXISTS idx_beds_active ON beds(is_active);

-- Create bed_stage_logs table (tracks all stage transitions)
CREATE TABLE IF NOT EXISTS bed_stage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bed_id UUID NOT NULL REFERENCES beds(id) ON DELETE CASCADE,
    from_stage_id UUID REFERENCES stages(id),
    to_stage_id UUID NOT NULL REFERENCES stages(id),
    changed_by_user_id UUID NOT NULL REFERENCES users(id),
    transition_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    duration_in_previous_stage_ms BIGINT,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for bed_stage_logs
CREATE INDEX IF NOT EXISTS idx_bed_logs_bed_id ON bed_stage_logs(bed_id);
CREATE INDEX IF NOT EXISTS idx_bed_logs_transition_time ON bed_stage_logs(transition_time);
CREATE INDEX IF NOT EXISTS idx_bed_logs_user ON bed_stage_logs(changed_by_user_id);

-- Insert default stages (based on PRD - Emergency Ward workflow)
INSERT INTO stages (name, display_order, color_code, description) VALUES
    ('Empty', 0, 'gray', 'Bed is available and ready for next patient'),
    ('Triage', 1, 'blue', 'Patient initial assessment and prioritization'),
    ('Registration', 2, 'cyan', 'Patient registration and documentation'),
    ('Doctor Assessment', 3, 'yellow', 'Doctor examining patient and ordering tests'),
    ('Treatment/Observation', 4, 'orange', 'Patient receiving treatment or under observation'),
    ('Decision Made', 5, 'green', 'Discharge decision made or admission arranged'),
    ('Discharge Process', 6, 'purple', 'Patient being discharged or transferred'),
    ('Cleaning', 7, 'pink', 'Bed being cleaned and prepared for next patient')
ON CONFLICT (name) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE stages IS 'Patient workflow stages in emergency ward';
COMMENT ON TABLE beds IS 'Emergency ward beds with current status';
COMMENT ON TABLE bed_stage_logs IS 'Historical log of all bed stage transitions';

COMMENT ON COLUMN beds.bed_number IS 'Unique bed identifier (e.g., ER-01, ER-02)';
COMMENT ON COLUMN beds.patient_start_time IS 'When current patient was admitted to this bed';
COMMENT ON COLUMN beds.last_stage_change IS 'Timestamp of most recent stage transition';
COMMENT ON COLUMN beds.metadata IS 'Flexible JSON field for additional bed data';

COMMENT ON COLUMN bed_stage_logs.duration_in_previous_stage_ms IS 'Time spent in previous stage (milliseconds)';
COMMENT ON COLUMN bed_stage_logs.metadata IS 'Additional context (e.g., delay reasons, notes)';
