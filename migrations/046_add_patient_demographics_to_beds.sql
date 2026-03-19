-- Migration 046: Add patient demographic columns to beds for US-21.1
-- Purpose: Centralize active patient identity fields for HIS linkage on intake

ALTER TABLE beds
ADD COLUMN IF NOT EXISTS patient_ipd_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS patient_age INTEGER,
ADD COLUMN IF NOT EXISTS patient_gender VARCHAR(20);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_beds_patient_age_range'
  ) THEN
    ALTER TABLE beds
      ADD CONSTRAINT chk_beds_patient_age_range
      CHECK (patient_age IS NULL OR (patient_age BETWEEN 1 AND 130));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_beds_patient_gender'
  ) THEN
    ALTER TABLE beds
      ADD CONSTRAINT chk_beds_patient_gender
      CHECK (patient_gender IS NULL OR patient_gender IN ('Male', 'Female', 'Other', 'Unknown'));
  END IF;
END $$;

COMMENT ON COLUMN beds.patient_ipd_id IS 'Optional IPD identifier; may be null before admission is finalized';
COMMENT ON COLUMN beds.patient_age IS 'Patient age in years';
COMMENT ON COLUMN beds.patient_gender IS 'Patient gender enum: Male/Female/Other/Unknown';

-- Down migration (manual rollback guidance)
-- ALTER TABLE beds DROP CONSTRAINT IF EXISTS chk_beds_patient_age_range;
-- ALTER TABLE beds DROP CONSTRAINT IF EXISTS chk_beds_patient_gender;
-- ALTER TABLE beds DROP COLUMN IF EXISTS patient_ipd_id;
-- ALTER TABLE beds DROP COLUMN IF EXISTS patient_age;
-- ALTER TABLE beds DROP COLUMN IF EXISTS patient_gender;
