-- Migration 017: System Settings table for US-6.3 (Set Time Thresholds)
-- Stores global key-value configuration including delay_threshold_minutes

CREATE TABLE IF NOT EXISTS system_settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       TEXT         NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Default global delay threshold: 3 hours = 180 minutes
INSERT INTO system_settings (key, value, description)
VALUES (
  'delay_threshold_minutes',
  '180',
  'Global delay threshold in minutes. Beds exceeding this time are flagged as delayed.'
)
ON CONFLICT (key) DO NOTHING;

-- Down Migration
-- DROP TABLE IF EXISTS system_settings;
