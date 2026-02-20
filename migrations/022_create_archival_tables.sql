-- Migration 022: Data Retention & Archival tables
-- EPIC 14 — US-14.1: Automated Data Archival
--
-- Creates mirror archive tables for patient_admissions and audit_logs,
-- plus an archival_runs log that tracks every archival job execution.
--
-- Archive tables intentionally have no FK constraints — the live rows
-- they reference may have been deleted by the time someone queries the archive.

-- ── patient_admissions_archive ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS patient_admissions_archive (
    id                              UUID        NOT NULL,
    bed_id                          UUID        NOT NULL,
    admitted_at                     TIMESTAMPTZ NOT NULL,
    discharged_at                   TIMESTAMPTZ NOT NULL,
    total_duration_ms               BIGINT      NOT NULL,
    discharged_by_user_id           UUID        NOT NULL,
    notes                           TEXT,
    created_at                      TIMESTAMPTZ NOT NULL,
    tat_from_previous_discharge_ms  BIGINT,
    -- Archival metadata
    archived_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pa_archive_discharged_at
    ON patient_admissions_archive(discharged_at DESC);

CREATE INDEX IF NOT EXISTS idx_pa_archive_bed_id
    ON patient_admissions_archive(bed_id);

COMMENT ON TABLE patient_admissions_archive IS
    'Cold store for patient_admissions rows past the configured retention period.';

-- ── audit_logs_archive ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs_archive (
    id                      UUID        NOT NULL,
    action_type             VARCHAR(50) NOT NULL,
    entity_type             VARCHAR(50) NOT NULL,
    entity_id               UUID        NOT NULL,
    performed_by_user_id    UUID        NOT NULL,
    target_user_id          UUID,
    changes                 JSONB       NOT NULL DEFAULT '{}'::jsonb,
    reason                  TEXT,
    metadata                JSONB       NOT NULL DEFAULT '{}'::jsonb,
    ip_address              INET,
    created_at              TIMESTAMPTZ NOT NULL,
    -- Archival metadata
    archived_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_al_archive_created_at
    ON audit_logs_archive(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_al_archive_entity
    ON audit_logs_archive(entity_type, entity_id);

COMMENT ON TABLE audit_logs_archive IS
    'Cold store for audit_logs rows past the configured retention period.';

-- ── archival_runs ─────────────────────────────────────────────────────────

CREATE TYPE archival_run_status AS ENUM (
    'running',
    'pending_approval',
    'completed',
    'failed'
);

CREATE TABLE IF NOT EXISTS archival_runs (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    triggered_by        TEXT            NOT NULL,  -- 'cron' or user_id
    status              archival_run_status NOT NULL DEFAULT 'running',
    cutoff_date         TIMESTAMPTZ     NOT NULL,
    started_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    ended_at            TIMESTAMPTZ,
    rows_archived       JSONB           NOT NULL DEFAULT '{}'::jsonb,
    error_message       TEXT,
    CONSTRAINT chk_ended_after_started CHECK (ended_at IS NULL OR ended_at >= started_at)
);

COMMENT ON TABLE archival_runs IS
    'Audit trail of every archival job: one row per execution.';

COMMENT ON COLUMN archival_runs.triggered_by IS
    '''cron'' for scheduled runs, or the user_id UUID for manual admin triggers.';

COMMENT ON COLUMN archival_runs.rows_archived IS
    'JSON map of table → row count, e.g. {"patient_admissions":120,"audit_logs":450}';

-- Down Migration
-- DROP TABLE IF EXISTS patient_admissions_archive;
-- DROP TABLE IF EXISTS audit_logs_archive;
-- DROP TABLE IF EXISTS archival_runs;
-- DROP TYPE IF EXISTS archival_run_status;
