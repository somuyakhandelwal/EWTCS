-- Migration 039: Error Events table for US-13.5 (Monitor Errors and System Health)
-- Stores all ERROR and CRITICAL level events captured by the logger for audit,
-- trend analysis, and admin dashboard display. WARN and below are console-only.

CREATE TABLE IF NOT EXISTS error_events (
  id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  level          VARCHAR(10)  NOT NULL CHECK (level IN ('WARN','ERROR','CRITICAL')),
  category       VARCHAR(30)  NOT NULL DEFAULT 'system',
  message        TEXT         NOT NULL,
  stack          TEXT,
  context        JSONB        NOT NULL DEFAULT '{}'::jsonb,
  acknowledged   BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Fast queries for dashboard trend windows (24h, 7d) and severity filters
CREATE INDEX IF NOT EXISTS idx_error_events_level_ts
  ON error_events (level, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_events_ts
  ON error_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_events_ack
  ON error_events (acknowledged, created_at DESC);

COMMENT ON TABLE error_events IS
  'Persisted ERROR/CRITICAL log events for US-13.5 health monitoring dashboard.';

COMMENT ON COLUMN error_events.level IS
  'Severity: WARN | ERROR | CRITICAL';

COMMENT ON COLUMN error_events.category IS
  'Source category: auth | database | api | backup | system';

COMMENT ON COLUMN error_events.acknowledged IS
  'Admin has acknowledged/resolved this event.';

-- Down Migration
-- DROP TABLE IF EXISTS error_events;
