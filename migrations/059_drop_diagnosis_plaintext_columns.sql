-- Migration 059: Drop diagnosis plaintext PHI columns after encrypted backfill
-- Purpose: EPIC-DB1 (DB1-01) - enforce encrypted-only PHI storage for diagnosis table

-- Up Migration

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    encryption_key TEXT;
    pending_backfill_count INTEGER := 0;
BEGIN
    IF to_regclass('public.diagnosis') IS NULL THEN
        RETURN;
    END IF;

    -- If plaintext columns are already gone (e.g., previously applied under another migration name),
    -- there is nothing to backfill or drop.
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'diagnosis'
          AND column_name IN (
            'symptoms_observed',
            'clinical_findings',
            'diagnosis_text',
            'recommended_action'
          )
    ) THEN
        RETURN;
    END IF;

    -- Ensure encrypted destination columns exist on all environments.
    ALTER TABLE diagnosis
        ADD COLUMN IF NOT EXISTS symptoms_observed_encrypted JSONB,
        ADD COLUMN IF NOT EXISTS clinical_findings_encrypted JSONB,
        ADD COLUMN IF NOT EXISTS diagnosis_text_encrypted JSONB,
        ADD COLUMN IF NOT EXISTS recommended_action_encrypted JSONB;

    SELECT COUNT(*)
    INTO pending_backfill_count
    FROM diagnosis
    WHERE (symptoms_observed IS NOT NULL AND btrim(symptoms_observed) <> '' AND symptoms_observed_encrypted IS NULL)
       OR (clinical_findings IS NOT NULL AND btrim(clinical_findings) <> '' AND clinical_findings_encrypted IS NULL)
       OR (diagnosis_text IS NOT NULL AND btrim(diagnosis_text) <> '' AND diagnosis_text_encrypted IS NULL)
       OR (recommended_action IS NOT NULL AND btrim(recommended_action) <> '' AND recommended_action_encrypted IS NULL);

    -- Backfill requires an encryption key. We intentionally fail closed when needed.
    encryption_key := current_setting('app.encryption_key', true);

    IF pending_backfill_count > 0 AND (encryption_key IS NULL OR btrim(encryption_key) = '') THEN
        RAISE EXCEPTION
            'Migration 059 requires app.encryption_key to backfill % plaintext diagnosis rows before dropping columns.',
            pending_backfill_count
            USING HINT = 'Run with PGOPTIONS="-c app.encryption_key=<64-char-hex-key>" npm run db:migrate';
    END IF;

    IF pending_backfill_count > 0 THEN
        UPDATE diagnosis
        SET
            symptoms_observed_encrypted = COALESCE(
                symptoms_observed_encrypted,
                CASE
                    WHEN symptoms_observed IS NOT NULL AND btrim(symptoms_observed) <> '' THEN
                        jsonb_build_object(
                            'data', encode(pgp_sym_encrypt(symptoms_observed, encryption_key, 'cipher-algo=aes256, compress-algo=0'), 'base64'),
                            'kv', 1,
                            'alg', 'pgp_sym_encrypt',
                            'encoding', 'base64'
                        )
                    ELSE NULL
                END
            ),
            clinical_findings_encrypted = COALESCE(
                clinical_findings_encrypted,
                CASE
                    WHEN clinical_findings IS NOT NULL AND btrim(clinical_findings) <> '' THEN
                        jsonb_build_object(
                            'data', encode(pgp_sym_encrypt(clinical_findings, encryption_key, 'cipher-algo=aes256, compress-algo=0'), 'base64'),
                            'kv', 1,
                            'alg', 'pgp_sym_encrypt',
                            'encoding', 'base64'
                        )
                    ELSE NULL
                END
            ),
            diagnosis_text_encrypted = COALESCE(
                diagnosis_text_encrypted,
                CASE
                    WHEN diagnosis_text IS NOT NULL AND btrim(diagnosis_text) <> '' THEN
                        jsonb_build_object(
                            'data', encode(pgp_sym_encrypt(diagnosis_text, encryption_key, 'cipher-algo=aes256, compress-algo=0'), 'base64'),
                            'kv', 1,
                            'alg', 'pgp_sym_encrypt',
                            'encoding', 'base64'
                        )
                    ELSE NULL
                END
            ),
            recommended_action_encrypted = COALESCE(
                recommended_action_encrypted,
                CASE
                    WHEN recommended_action IS NOT NULL AND btrim(recommended_action) <> '' THEN
                        jsonb_build_object(
                            'data', encode(pgp_sym_encrypt(recommended_action, encryption_key, 'cipher-algo=aes256, compress-algo=0'), 'base64'),
                            'kv', 1,
                            'alg', 'pgp_sym_encrypt',
                            'encoding', 'base64'
                        )
                    ELSE NULL
                END
            );

        -- Guardrail: do not drop plaintext columns if any required encrypted value is still missing.
        IF EXISTS (
            SELECT 1
            FROM diagnosis
            WHERE (symptoms_observed IS NOT NULL AND btrim(symptoms_observed) <> '' AND symptoms_observed_encrypted IS NULL)
               OR (clinical_findings IS NOT NULL AND btrim(clinical_findings) <> '' AND clinical_findings_encrypted IS NULL)
               OR (diagnosis_text IS NOT NULL AND btrim(diagnosis_text) <> '' AND diagnosis_text_encrypted IS NULL)
               OR (recommended_action IS NOT NULL AND btrim(recommended_action) <> '' AND recommended_action_encrypted IS NULL)
        ) THEN
            RAISE EXCEPTION 'Migration 059 backfill failed: encrypted diagnosis columns still missing values.';
        END IF;
    END IF;

    ALTER TABLE diagnosis
        DROP COLUMN IF EXISTS symptoms_observed,
        DROP COLUMN IF EXISTS clinical_findings,
        DROP COLUMN IF EXISTS diagnosis_text,
        DROP COLUMN IF EXISTS recommended_action;
END $$;

-- Down Migration
-- NOTE: Re-adding plaintext columns does not restore original plaintext data.
-- ALTER TABLE diagnosis
--     ADD COLUMN IF NOT EXISTS symptoms_observed TEXT,
--     ADD COLUMN IF NOT EXISTS clinical_findings TEXT,
--     ADD COLUMN IF NOT EXISTS diagnosis_text TEXT,
--     ADD COLUMN IF NOT EXISTS recommended_action TEXT;
