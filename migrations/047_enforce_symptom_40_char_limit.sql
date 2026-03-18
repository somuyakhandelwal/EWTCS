-- Migration 047: Enforce US-22.1 symptom/complaint length limit
-- Project intake model stores active complaint on beds.key_symptom

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'beds'
      AND column_name = 'key_symptom'
  ) THEN
    ALTER TABLE beds
      ALTER COLUMN key_symptom TYPE VARCHAR(40)
      USING (
        CASE
          WHEN key_symptom IS NULL THEN NULL
          ELSE LEFT(key_symptom, 40)
        END
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_beds_key_symptom_max_40'
  ) THEN
    ALTER TABLE beds
      ADD CONSTRAINT chk_beds_key_symptom_max_40
      CHECK (key_symptom IS NULL OR char_length(key_symptom) <= 40);
  END IF;
END $$;

COMMENT ON COLUMN beds.key_symptom IS
  'Symptoms / Complaint captured at triage (max 40 chars).';

-- Down migration (manual rollback guidance)
-- ALTER TABLE beds DROP CONSTRAINT IF EXISTS chk_beds_key_symptom_max_40;
-- ALTER TABLE beds ALTER COLUMN key_symptom TYPE TEXT;
