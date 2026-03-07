-- Migration 038: Admin-configurable delay reason options (US-17, EPIC-17)

-- Up Migration

CREATE TABLE IF NOT EXISTS delay_reason_options (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  value         TEXT NOT NULL UNIQUE,
  label         TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delay_reason_options_active
  ON delay_reason_options(is_active);

INSERT INTO delay_reason_options (value, label, display_order) VALUES
  ('no_icu_bed',          'No ICU Bed',             1),
  ('no_general_ward_bed', 'No General Ward Bed',    2),
  ('no_bed_upstairs',     'No Bed Upstairs',        3),
  ('awaiting_transport',  'Awaiting Transport',     4),
  ('family_consent',      'Awaiting Family Consent',5),
  ('awaiting_specialist', 'Awaiting Specialist',    6),
  ('other',               'Other',                  7)
ON CONFLICT (value) DO NOTHING;

-- Down Migration

DROP TABLE IF EXISTS delay_reason_options;
