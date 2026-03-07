-- Migration 022: Report Sign-Off Table
-- US-12.4: Enable Supervisor Sign-Off on management reports

CREATE TABLE IF NOT EXISTS report_sign_offs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date     DATE NOT NULL,          -- the date the report covers
    signed_off_by   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    signed_off_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes           TEXT,
    superseded_by   UUID REFERENCES report_sign_offs(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Each date can have multiple sign-offs (chain via superseded_by), but only
-- the latest one (where superseded_by IS NULL) is considered active.
CREATE INDEX IF NOT EXISTS idx_report_sign_offs_date        ON report_sign_offs(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_report_sign_offs_signed_by   ON report_sign_offs(signed_off_by);
CREATE INDEX IF NOT EXISTS idx_report_sign_offs_active      ON report_sign_offs(report_date) WHERE superseded_by IS NULL;

COMMENT ON TABLE report_sign_offs IS
    'US-12.4: Supervisor sign-off records for management report dates. '
    'Sign-offs cannot be deleted, only superseded by a newer sign-off.';
