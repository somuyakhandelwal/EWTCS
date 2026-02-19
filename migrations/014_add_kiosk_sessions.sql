-- Kiosk Sessions Table
-- Epic 5: Authentication & Role-Based Access (US-5.3)
-- Purpose: Track active kiosk sessions bound to specific IPs for admin control

CREATE TABLE IF NOT EXISTS kiosk_sessions (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bound_ip     VARCHAR(45) NOT NULL,
    is_active    BOOLEAN     NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    disabled_at  TIMESTAMPTZ,
    disabled_by  UUID        REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_kiosk_sessions_user    ON kiosk_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_kiosk_sessions_active  ON kiosk_sessions(is_active) WHERE is_active = true;

-- Down Migration
DROP TABLE IF EXISTS kiosk_sessions;
