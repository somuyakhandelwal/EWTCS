-- Migration 015: Create Shifts Table (US-8.1)
-- Purpose: Define shift schedules for shift-based data analysis
-- Epic: EPIC 8 - Shift Management

-- Up Migration
-- Note: migration 017_create_shifts.sql may have already created the shifts
-- table without the is_default column. We use ADD COLUMN IF NOT EXISTS
-- to handle both a fresh install and an upgrade from 017.

CREATE TABLE IF NOT EXISTS shifts (
    id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    name         VARCHAR(100) NOT NULL UNIQUE,
    start_time   TIME         NOT NULL,
    end_time     TIME         NOT NULL,
    is_active    BOOLEAN      NOT NULL DEFAULT true,
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add is_default column if it does not already exist (idempotent upgrade)
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_shifts_active  ON shifts(is_active);
CREATE INDEX IF NOT EXISTS idx_shifts_default ON shifts(is_default);

COMMENT ON TABLE  shifts            IS 'Shift schedules used to tag bed status updates. Supports overlap for transition periods.';
COMMENT ON COLUMN shifts.start_time IS 'Wall-clock start time (HH:MM). For Night shift this may be > end_time (wraps midnight).';
COMMENT ON COLUMN shifts.end_time   IS 'Wall-clock end time (HH:MM). If < start_time, the shift crosses midnight.';
COMMENT ON COLUMN shifts.is_default IS 'Default shifts (Morning, Evening, Night) are protected from deletion.';

-- Insert default shifts (AC: Morning 6am-2pm, Evening 2pm-10pm, Night 10pm-6am)
-- ON CONFLICT: if the row already exists (from migration 017), update is_default.
INSERT INTO shifts (name, start_time, end_time, is_default) VALUES
    ('Morning', '06:00', '14:00', true),
    ('Evening', '14:00', '22:00', true),
    ('Night',   '22:00', '06:00', true)
ON CONFLICT (name) DO UPDATE SET is_default = EXCLUDED.is_default;

-- Down Migration
-- DROP TABLE IF EXISTS shifts;
