-- Migration 031: Archive bed stage logs for long-term retention
-- Purpose: Ensure historical stage transitions are permanently retained for audit
-- Epic: EPIC 3 - Time Tracking & Stage Logging (US-3.6)
--
-- Creates a cold-store table for bed_stage_logs records older than 90 days.
-- Rows are moved by the EPIC 14 archival runner in batches.

CREATE TABLE IF NOT EXISTS bed_stage_logs_archive (
    id UUID NOT NULL,
    bed_id UUID NOT NULL,
    from_stage_id UUID,
    to_stage_id UUID NOT NULL,
    changed_by_user_id UUID NOT NULL,
    transition_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_in_previous_stage_ms BIGINT,
    notes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    shift_id UUID,
    shift_override_by_user_id UUID,
    archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bsl_archive_transition_time
    ON bed_stage_logs_archive(transition_time DESC);

CREATE INDEX IF NOT EXISTS idx_bsl_archive_bed_id
    ON bed_stage_logs_archive(bed_id);

CREATE INDEX IF NOT EXISTS idx_bsl_archive_user_id
    ON bed_stage_logs_archive(changed_by_user_id);

CREATE INDEX IF NOT EXISTS idx_bsl_archive_shift_id
    ON bed_stage_logs_archive(shift_id);

COMMENT ON TABLE bed_stage_logs_archive IS
    'Cold store for historical bed_stage_logs retained for compliance and audits.';

COMMENT ON COLUMN bed_stage_logs_archive.archived_at IS
    'Timestamp when the log row was moved from bed_stage_logs to archive.';

-- Down Migration
-- DROP TABLE IF EXISTS bed_stage_logs_archive;
