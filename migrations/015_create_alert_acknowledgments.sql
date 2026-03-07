-- Alert Acknowledgments Table
-- EPIC 15: Notifications & Alerts (US-15.4)
-- Purpose: Store supervisor acknowledgments for ward alerts so they can be
--   dismissed until a supervisor-chosen expiry time.

CREATE TYPE alert_type AS ENUM (
    'delayed_bed',
    'disposition_bottleneck'
);

CREATE TABLE IF NOT EXISTS alert_acknowledgments (
    id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type              alert_type  NOT NULL,
    -- Composite business key: '{alert_type}:{bed_id}'
    -- e.g. 'delayed_bed:3fa85f64-5717-4562-b3fc-2c963f66afa6'
    alert_key               TEXT        NOT NULL,
    bed_id                  UUID        REFERENCES beds(id) ON DELETE CASCADE,
    acknowledged_by_user_id UUID        NOT NULL REFERENCES users(id),
    acknowledged_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Supervisor chooses how long to suppress: 1 h, 2 h, 4 h, or 8 h
    expires_at              TIMESTAMPTZ NOT NULL,
    notes                   TEXT,
    CONSTRAINT uq_alert_key UNIQUE (alert_key)
);

CREATE INDEX IF NOT EXISTS idx_alert_acks_expires
    ON alert_acknowledgments(expires_at);

CREATE INDEX IF NOT EXISTS idx_alert_acks_bed_id
    ON alert_acknowledgments(bed_id);

CREATE INDEX IF NOT EXISTS idx_alert_acks_type
    ON alert_acknowledgments(alert_type);

CREATE INDEX IF NOT EXISTS idx_alert_acks_active
    ON alert_acknowledgments(alert_key, expires_at);

-- Down Migration
-- DROP TABLE IF EXISTS alert_acknowledgments;
-- DROP TYPE  IF EXISTS alert_type;
