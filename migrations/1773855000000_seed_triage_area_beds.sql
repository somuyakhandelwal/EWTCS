-- Migration 1773855000000: Seed dedicated triage area
-- Purpose: EPIC 20 / US - Dedicated 6-bed triage dashboard support

-- Ensure TRIAGE ward exists
INSERT INTO wards (name, code, description, is_active)
VALUES ('Triage Area', 'TRIAGE', 'Dedicated initial assessment area', true)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = true,
    updated_at = CURRENT_TIMESTAMP;

-- Seed six triage beds when missing.
WITH triage_ward AS (
  SELECT id, name
  FROM wards
  WHERE code = 'TRIAGE'
  LIMIT 1
), empty_stage AS (
  SELECT id
  FROM stages
  WHERE name = 'Empty'
  LIMIT 1
), triage_beds(bed_number) AS (
  VALUES
    ('TRIAGE-01'),
    ('TRIAGE-02'),
    ('TRIAGE-03'),
    ('TRIAGE-04'),
    ('TRIAGE-05'),
    ('TRIAGE-06')
)
INSERT INTO beds (
  bed_number,
  current_stage_id,
  last_stage_change,
  is_occupied,
  is_active,
  ward_id,
  ward_name,
  metadata,
  is_temporary,
  is_virtual
)
SELECT
  b.bed_number,
  es.id,
  CURRENT_TIMESTAMP,
  false,
  true,
  tw.id,
  tw.name,
  '{}'::jsonb,
  false,
  false
FROM triage_beds b
CROSS JOIN triage_ward tw
CROSS JOIN empty_stage es
WHERE NOT EXISTS (
  SELECT 1
  FROM beds existing
  WHERE existing.bed_number = b.bed_number
);
