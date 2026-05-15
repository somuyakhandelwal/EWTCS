-- Migration: create_user_settings
-- EPIC DB5-02: Persist Dashboard & Filter Preferences in DB
-- Replaces localStorage/sessionStorage keys:
--   ewtcs-dashboard-settings  (confirmCriticalStages)
--   ewtcs:bedFilter            (showDelayedOnly, sortOrder)
--   ewtcs_help_panel_open      (helpPanelOpen)

-- UP
CREATE TABLE IF NOT EXISTS user_settings (
  user_id    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DOWN
-- DROP TABLE IF EXISTS user_settings;
