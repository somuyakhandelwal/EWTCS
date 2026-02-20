-- Migration 015: Add Turnaround Time (TAT) to Patient Admissions
-- Purpose: Track time from previous discharge to next patient admission per bed
-- Epic: EPIC 3 - Time Tracking & Stage Logging (US-3.4)
--
-- TAT = time between the previous patient's discharge and the current patient's admission
-- on the same bed. Computed and stored at discharge time for efficient querying.
-- NULL for the first patient on a bed (no previous discharge exists).

-- Up Migration

ALTER TABLE patient_admissions
    ADD COLUMN IF NOT EXISTS tat_from_previous_discharge_ms BIGINT DEFAULT NULL;

COMMENT ON COLUMN patient_admissions.tat_from_previous_discharge_ms IS
    'Turnaround time in ms: previous patient discharged_at → this patient admitted_at. NULL for the first admission on a bed.';

-- Composite index for the lookup query that finds the previous discharge for a bed
CREATE INDEX IF NOT EXISTS idx_patient_admissions_bed_discharged
    ON patient_admissions(bed_id, discharged_at DESC);

-- Index for analytics queries filtering on non-null TAT values
CREATE INDEX IF NOT EXISTS idx_patient_admissions_tat_not_null
    ON patient_admissions(tat_from_previous_discharge_ms)
    WHERE tat_from_previous_discharge_ms IS NOT NULL;

-- Backfill: compute TAT for existing admission records.
-- For each admission, find the most recent prior discharge on the same bed
-- and compute admitted_at - prev_discharged_at in milliseconds.
UPDATE patient_admissions AS curr
SET tat_from_previous_discharge_ms = (
    EXTRACT(EPOCH FROM (curr.admitted_at - prev.discharged_at)) * 1000
)::BIGINT
FROM (
    SELECT
        pa.id AS curr_id,
        (
            SELECT discharged_at
            FROM patient_admissions prev
            WHERE prev.bed_id = pa.bed_id
              AND prev.discharged_at < pa.admitted_at
            ORDER BY prev.discharged_at DESC
            LIMIT 1
        ) AS discharged_at
    FROM patient_admissions pa
) AS prev
WHERE curr.id = prev.curr_id
  AND prev.discharged_at IS NOT NULL
  AND curr.tat_from_previous_discharge_ms IS NULL;

-- Down Migration (rollback)
-- ALTER TABLE patient_admissions DROP COLUMN IF EXISTS tat_from_previous_discharge_ms;
-- DROP INDEX IF EXISTS idx_patient_admissions_bed_discharged;
-- DROP INDEX IF EXISTS idx_patient_admissions_tat_not_null;
