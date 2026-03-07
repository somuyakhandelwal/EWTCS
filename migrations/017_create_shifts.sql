-- Shift Schedules
-- EPIC 8: Shift Management (US-8.1)
-- Admin-configurable shifts (Morning / Evening / Night) used to tag
-- log entries so reports can be analysed per-shift.

CREATE TABLE shifts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL UNIQUE,
  -- HH:MM (24-h) stored as time — no timezone, applied to local ward clock
  start_time TIME        NOT NULL,
  end_time   TIME        NOT NULL,
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shifts_active ON shifts(is_active);

COMMENT ON TABLE shifts IS 'Configurable shift windows for tagging bed-stage log entries.';
COMMENT ON COLUMN shifts.start_time IS '24-hour start time, e.g. 06:00:00';
COMMENT ON COLUMN shifts.end_time IS
  '24-hour end time. Values < start_time indicate a shift that crosses midnight, e.g. 22:00–06:00.';

-- Default shifts (Morning 06:00–14:00, Evening 14:00–22:00, Night 22:00–06:00)
INSERT INTO shifts (name, start_time, end_time) VALUES
  ('Morning', '06:00:00', '14:00:00'),
  ('Evening', '14:00:00', '22:00:00'),
  ('Night',   '22:00:00', '06:00:00')
ON CONFLICT (name) DO NOTHING;
