-- Migration 024: Archive retrieval indexes + storage alert threshold
-- EPIC 14 — US-14.3: Auditor Archive Retrieval
--           US-14.4: Storage Optimization & Monitoring
--
-- 1. Composite indexes for fast date-range search on archive tables (US-14.3).
-- 2. Default storage alert threshold seeded into system_settings (US-14.4).

-- ── US-14.3: Archive search indexes ──────────────────────────────────────

-- patient_admissions_archive: search by admitted_at + discharged_at ranges
CREATE INDEX IF NOT EXISTS idx_pa_archive_admitted_at
    ON patient_admissions_archive(admitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_pa_archive_date_range
    ON patient_admissions_archive(admitted_at, discharged_at);

-- audit_logs_archive: search by created_at range + entity type
CREATE INDEX IF NOT EXISTS idx_al_archive_created_entity
    ON audit_logs_archive(created_at DESC, entity_type);

-- ── US-14.4: Storage alert threshold ─────────────────────────────────────

INSERT INTO system_settings (key, value, description) VALUES
(
    'storage_alert_threshold_gb',
    '10',
    'Alert when total database size exceeds this value in gigabytes (EPIC 14 US-14.4)'
)
ON CONFLICT (key) DO NOTHING;

-- Down Migration
-- DROP INDEX IF EXISTS idx_pa_archive_admitted_at;
-- DROP INDEX IF EXISTS idx_pa_archive_date_range;
-- DROP INDEX IF EXISTS idx_al_archive_created_entity;
-- DELETE FROM system_settings WHERE key = 'storage_alert_threshold_gb';
