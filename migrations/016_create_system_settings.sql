-- Migration 016: Create system_settings table
-- Purpose: Store global configuration settings like default delay threshold

CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed default delay threshold (3 hours = 180 minutes)
INSERT INTO system_settings (key, value, description)
VALUES ('default_delay_threshold_minutes', '180', 'Global default threshold for identifying delayed beds (in minutes)')
ON CONFLICT (key) DO NOTHING;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
