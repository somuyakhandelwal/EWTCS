-- Migration 038: Create per-user alert preferences for EPIC 15 (US-15.5)
-- Stores supervisor/admin notification preferences and thresholds.

CREATE TABLE IF NOT EXISTS alert_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    enabled_alert_types JSONB NOT NULL DEFAULT '{
      "delayedBeds": true,
      "escalations": true,
      "dispositionBottlenecks": true,
      "systemErrors": true
    }'::jsonb,
    threshold_overrides JSONB NOT NULL DEFAULT '{
      "delayMinutes": 180,
      "escalationMinutes": 240,
      "bottleneckCount": 3
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_alert_types_json_object CHECK (jsonb_typeof(enabled_alert_types) = 'object'),
    CONSTRAINT chk_threshold_overrides_json_object CHECK (jsonb_typeof(threshold_overrides) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_alert_preferences_user_id ON alert_preferences(user_id);

COMMENT ON TABLE alert_preferences IS
'Per-user alert notification preferences (US-15.5).';

COMMENT ON COLUMN alert_preferences.enabled_alert_types IS
'Boolean map of alert toggles: delayedBeds, escalations, dispositionBottlenecks, systemErrors.';

COMMENT ON COLUMN alert_preferences.threshold_overrides IS
'Per-user threshold overrides in minutes/count for alerting sensitivity.';

-- Down Migration
-- DROP TABLE IF EXISTS alert_preferences;