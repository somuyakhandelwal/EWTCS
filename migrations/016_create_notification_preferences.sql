-- User Notification Preferences
-- EPIC 15: Notifications & Alerts (US-15.5)
-- Stores per-user preferences: which alert types to receive, and an optional
-- custom minimum delay threshold that overrides the global system default.

CREATE TABLE user_notification_preferences (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_type                  TEXT        NOT NULL,
  enabled                     BOOLEAN     NOT NULL DEFAULT true,
  -- Override (in minutes) for the minimum elapsed time before this alert fires.
  -- NULL means "use the system default".
  min_delay_threshold_minutes INT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_user_alert_type UNIQUE (user_id, alert_type)
);

CREATE INDEX idx_notif_prefs_user ON user_notification_preferences(user_id);

COMMENT ON TABLE user_notification_preferences IS
  'Per-user alert preferences: enabled flag and optional custom delay thresholds.';
COMMENT ON COLUMN user_notification_preferences.min_delay_threshold_minutes IS
  'If set, replaces the global threshold for this alert type for this user (0-1440 min).';
