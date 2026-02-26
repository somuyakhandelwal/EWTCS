-- Migration 023: Seed default retention configuration into system_settings
-- EPIC 14 — US-14.2: Configurable Data Retention
--
-- Inserts default retention periods (years) and behaviour flags.
-- All values match legal minimums for Indian medical records (7 years).
-- ON CONFLICT DO NOTHING — safe to re-run; manual admin changes are preserved.

INSERT INTO system_settings (key, value, description) VALUES
(
    'retention_patient_admissions_years',
    '7',
    'Years to retain patient_admissions rows before archiving (EPIC 14)'
),
(
    'retention_audit_logs_years',
    '7',
    'Years to retain audit_logs rows before archiving (EPIC 14)'
),
(
    'retention_bed_stage_log_years',
    '2',
    'Years to retain bed_stage_log rows before archiving (EPIC 14)'
),
(
    'retention_requires_approval',
    'true',
    'When true, cron-triggered archival jobs pause for admin approval before deleting data (EPIC 14)'
)
ON CONFLICT (key) DO NOTHING;

-- Down Migration
-- DELETE FROM system_settings WHERE key LIKE 'retention_%';
