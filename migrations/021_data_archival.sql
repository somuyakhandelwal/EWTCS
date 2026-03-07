-- Migration 021: Data archival table for bed_stage_logs
-- EPIC 14: US-14.1 — Archive old data (>N months) to keep active table fast
-- EPIC 14: US-14.2 — Configurable retention policy

CREATE TABLE IF NOT EXISTS bed_stage_logs_archive (
    LIKE bed_stage_logs INCLUDING DEFAULTS INCLUDING CONSTRAINTS
);

-- Targeted indexes for the archive — only columns that actually exist
CREATE INDEX IF NOT EXISTS idx_bsla_bed_id       ON bed_stage_logs_archive(bed_id);
CREATE INDEX IF NOT EXISTS idx_bsla_transition   ON bed_stage_logs_archive(transition_time);
CREATE INDEX IF NOT EXISTS idx_bsla_shift_id     ON bed_stage_logs_archive(shift_id);

-- Retention policy configuration table
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     TEXT NOT NULL UNIQUE,   -- e.g. 'bed_stage_logs'
    retain_months   INTEGER NOT NULL DEFAULT 24,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default policy: keep bed_stage_logs for 24 months in active table
INSERT INTO data_retention_policies (entity_type, retain_months)
VALUES ('bed_stage_logs', 24)
ON CONFLICT (entity_type) DO NOTHING;

COMMENT ON TABLE bed_stage_logs_archive IS 'Archived bed stage transition logs older than the retention threshold';
COMMENT ON TABLE data_retention_policies IS 'Configurable data retention periods per entity type';
