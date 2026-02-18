-- Migration 011: Add Disposition Bottleneck Tracking
-- Purpose: Track patients stuck in "Decision Made" stage waiting for beds upstairs
-- Epic: EPIC 1 - Nurse Desk Bed Dashboard (US-1.6)

-- Enum for delay reasons
DO $$ BEGIN
    CREATE TYPE disposition_delay_reason_type AS ENUM (
        'no_bed_upstairs',
        'awaiting_transport',
        'family_consent',
        'awaiting_specialist',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Table to store recorded reasons for disposition bottlenecks
-- One row per bottleneck event (a patient entering Decision Made and being flagged)
CREATE TABLE IF NOT EXISTS disposition_delay_reasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Which bed is stuck
    bed_id UUID NOT NULL REFERENCES beds(id) ON DELETE CASCADE,

    -- Link to the exact log entry when patient entered Decision Made
    -- Allows clean historical reporting per admission
    bed_stage_log_id UUID REFERENCES bed_stage_logs(id) ON DELETE SET NULL,

    -- The recorded reason for the delay
    reason disposition_delay_reason_type NOT NULL,

    -- Optional free-text notes
    notes TEXT,

    -- Who recorded the reason
    recorded_by_user_id UUID NOT NULL REFERENCES users(id),

    -- When reason was recorded
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- When the bottleneck was resolved (patient left Decision Made stage)
    -- NULL means still active
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for efficient dashboard queries
CREATE INDEX IF NOT EXISTS idx_disposition_delay_bed_id
    ON disposition_delay_reasons(bed_id);

CREATE INDEX IF NOT EXISTS idx_disposition_delay_log_id
    ON disposition_delay_reasons(bed_stage_log_id);

CREATE INDEX IF NOT EXISTS idx_disposition_delay_resolved
    ON disposition_delay_reasons(resolved_at)
    WHERE resolved_at IS NULL;

-- Index on bed_stage_logs to efficiently find when a bed entered Decision Made
CREATE INDEX IF NOT EXISTS idx_bed_stage_logs_bed_to_stage
    ON bed_stage_logs(bed_id, to_stage_id);

-- Comments
COMMENT ON TABLE disposition_delay_reasons IS
    'Records reasons for patients stuck in Decision Made stage waiting for beds upstairs (US-1.6)';
COMMENT ON COLUMN disposition_delay_reasons.bed_stage_log_id IS
    'Links to the log entry when the patient entered Decision Made stage';
COMMENT ON COLUMN disposition_delay_reasons.resolved_at IS
    'Set when patient leaves Decision Made stage. NULL = bottleneck still active.';

-- Down Migration
DROP INDEX IF EXISTS idx_bed_stage_logs_bed_to_stage;
DROP INDEX IF EXISTS idx_disposition_delay_resolved;
DROP INDEX IF EXISTS idx_disposition_delay_log_id;
DROP INDEX IF EXISTS idx_disposition_delay_bed_id;
DROP TABLE IF EXISTS disposition_delay_reasons;
DROP TYPE IF EXISTS disposition_delay_reason_type;
