-- Migration 007: Create Bed Stage Log Corrections Table
-- Purpose: Allow corrections to immutable bed stage logs through a separate audit trail
-- EPIC 3: Time Tracking & Stage Logging
--
-- Since bed_stage_logs are immutable, corrections must be tracked separately
-- This table maintains a full audit trail of any corrections made

CREATE TABLE IF NOT EXISTS bed_stage_log_corrections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bed_stage_log_id UUID NOT NULL,
    corrected_by_user_id UUID NOT NULL,
    correction_reason TEXT NOT NULL,
    corrected_fields JSONB DEFAULT '{}'::jsonb,
    corrected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT bed_stage_log_corrections_bed_stage_log_id_fkey 
        FOREIGN KEY (bed_stage_log_id) 
        REFERENCES bed_stage_logs(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT bed_stage_log_corrections_corrected_by_user_id_fkey 
        FOREIGN KEY (corrected_by_user_id) 
        REFERENCES users(id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_bed_stage_log_corrections_log_id 
    ON bed_stage_log_corrections(bed_stage_log_id);

CREATE INDEX IF NOT EXISTS idx_bed_stage_log_corrections_user 
    ON bed_stage_log_corrections(corrected_by_user_id);

CREATE INDEX IF NOT EXISTS idx_bed_stage_log_corrections_time 
    ON bed_stage_log_corrections(corrected_at);

-- Add comments for documentation
COMMENT ON TABLE bed_stage_log_corrections IS 
'Audit trail for corrections made to immutable bed_stage_logs records. Maintains full history of changes.';

COMMENT ON COLUMN bed_stage_log_corrections.corrected_fields IS 
'JSON describing corrected values';

COMMENT ON COLUMN bed_stage_log_corrections.correction_reason IS 
'Human-readable explanation for why the correction was made';
