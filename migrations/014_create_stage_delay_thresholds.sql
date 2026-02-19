-- Migration: Create stage_delay_thresholds table for per-stage delay configuration
CREATE TABLE IF NOT EXISTS stage_delay_thresholds (
    id SERIAL PRIMARY KEY,
    stage_id UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
    threshold_minutes INTEGER NOT NULL DEFAULT 180, -- 3 hours default
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure only one threshold per stage
CREATE UNIQUE INDEX IF NOT EXISTS idx_stage_delay_thresholds_stage_id ON stage_delay_thresholds(stage_id);
