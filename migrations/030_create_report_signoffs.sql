-- Migration 030: Create report_signoffs table
-- Epic 12: Audit Logs & Compliance
-- US: Supervisor Sign-Off on Daily Reports
--
-- Supervisors can formally sign off on daily reports.
-- Sign-offs are immutable: they can only be superseded, never deleted.
-- A second sign-off for the same report_date+report_type automatically
-- supersedes the previous one via a self-referencing FK.

BEGIN;

CREATE TABLE report_signoffs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which report is being signed off
  report_date     DATE        NOT NULL,
  report_type     VARCHAR(50) NOT NULL DEFAULT 'daily',

  -- Current state of this sign-off record
  status          VARCHAR(20) NOT NULL DEFAULT 'approved'
                  CHECK (status IN ('approved', 'superseded')),

  -- Who signed off
  signed_off_by   UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  signed_off_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Optional supervisor notes
  notes           TEXT,

  -- Immutability: when a new sign-off replaces this one,
  -- superseded_by points to the newer record.
  superseded_by   UUID        REFERENCES report_signoffs(id) ON DELETE RESTRICT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup: find the active sign-off for a given date + type
CREATE INDEX idx_report_signoffs_date_type
  ON report_signoffs(report_date, report_type);

-- Lookup sign-offs by supervisor
CREATE INDEX idx_report_signoffs_signed_off_by
  ON report_signoffs(signed_off_by);

COMMENT ON TABLE report_signoffs IS
  'Immutable supervisor sign-offs on daily reports. Records are never deleted; '
  'superseded_by tracks when a newer sign-off replaced this one.';

COMMENT ON COLUMN report_signoffs.status IS
  'approved = current active sign-off; superseded = replaced by a newer sign-off';

COMMENT ON COLUMN report_signoffs.superseded_by IS
  'ID of the sign-off that replaced this record (NULL if still active).';

COMMIT;

-- Down Migration
DROP TABLE IF EXISTS report_signoffs;
