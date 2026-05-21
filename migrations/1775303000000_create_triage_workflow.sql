-- Migration 1775303000000: Dedicated triage bed workflow
-- Purpose: EPIC 25 - model triage as a separate 6-bed physical area.

DO $$ BEGIN
  CREATE TYPE triage_bed_state AS ENUM (
    'empty',
    'initial_treatment',
    'decision_made',
    'cleaning'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS triage_bed_statuses (
  bed_id UUID PRIMARY KEY REFERENCES beds(id) ON DELETE CASCADE,
  state triage_bed_state NOT NULL DEFAULT 'empty',
  last_state_change TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS triage_state_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bed_id UUID NOT NULL REFERENCES beds(id) ON DELETE CASCADE,
  from_state triage_bed_state,
  to_state triage_bed_state NOT NULL,
  changed_by_user_id UUID NOT NULL REFERENCES users(id),
  transition_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  duration_in_previous_state_ms BIGINT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_triage_statuses_state
  ON triage_bed_statuses(state);
CREATE INDEX IF NOT EXISTS idx_triage_logs_bed_id
  ON triage_state_logs(bed_id);
CREATE INDEX IF NOT EXISTS idx_triage_logs_transition_time
  ON triage_state_logs(transition_time);
CREATE INDEX IF NOT EXISTS idx_triage_logs_user
  ON triage_state_logs(changed_by_user_id);

INSERT INTO wards (name, code, description, is_active)
VALUES ('Triage Area', 'TRIAGE', 'Dedicated initial assessment area', true)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = true,
    updated_at = CURRENT_TIMESTAMP;

WITH triage_ward AS (
  SELECT id, name FROM wards WHERE code = 'TRIAGE' LIMIT 1
), empty_stage AS (
  SELECT id FROM stages WHERE name = 'Empty' LIMIT 1
), target_beds(bed_number) AS (
  VALUES
    ('TRIAGE-01'), ('TRIAGE-02'), ('TRIAGE-03'),
    ('TRIAGE-04'), ('TRIAGE-05'), ('TRIAGE-06')
)
INSERT INTO beds (
  bed_number, current_stage_id, last_stage_change, is_occupied, is_active,
  ward_id, ward_name, metadata, is_temporary, is_virtual
)
SELECT
  tb.bed_number, es.id, CURRENT_TIMESTAMP, false, true,
  tw.id, tw.name, '{}'::jsonb, false, false
FROM target_beds tb
CROSS JOIN triage_ward tw
CROSS JOIN empty_stage es
ON CONFLICT (bed_number) DO UPDATE
SET ward_id = EXCLUDED.ward_id,
    ward_name = EXCLUDED.ward_name,
    is_active = true,
    is_temporary = false,
    is_virtual = false,
    updated_at = CURRENT_TIMESTAMP;

WITH triage_ward AS (
  SELECT id FROM wards WHERE code = 'TRIAGE' LIMIT 1
), target_beds(bed_number) AS (
  VALUES
    ('TRIAGE-01'), ('TRIAGE-02'), ('TRIAGE-03'),
    ('TRIAGE-04'), ('TRIAGE-05'), ('TRIAGE-06')
)
UPDATE beds
SET is_active = false,
    updated_at = CURRENT_TIMESTAMP
WHERE ward_id = (SELECT id FROM triage_ward)
  AND bed_number NOT IN (SELECT bed_number FROM target_beds);

INSERT INTO triage_bed_statuses (bed_id, state, last_state_change)
SELECT b.id, 'empty'::triage_bed_state, COALESCE(b.last_stage_change, CURRENT_TIMESTAMP)
FROM beds b
JOIN wards w ON w.id = b.ward_id AND w.code = 'TRIAGE'
WHERE b.bed_number IN (
  'TRIAGE-01', 'TRIAGE-02', 'TRIAGE-03',
  'TRIAGE-04', 'TRIAGE-05', 'TRIAGE-06'
)
ON CONFLICT (bed_id) DO NOTHING;

COMMENT ON TABLE triage_bed_statuses IS
  'Current triage-specific state for each physical triage bed. Independent of ER stages.';
COMMENT ON TABLE triage_state_logs IS
  'Immutable audit trail of triage bed state transitions.';
