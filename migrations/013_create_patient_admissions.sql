-- Migration 013: Create Patient Admissions Archive Table
-- Purpose: Archive completed patient stays atomically on discharge
-- Epic: EPIC 2 - One-Click Stage Update System (US-2.3)
--
-- When a nurse confirms discharge, the server action inserts a row here BEFORE
-- clearing patient_start_time on the bed, guaranteeing no data is ever lost.

-- Up Migration

CREATE TABLE IF NOT EXISTS patient_admissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Which bed the patient occupied
    bed_id UUID NOT NULL REFERENCES beds(id) ON DELETE CASCADE,

    -- Snapshot of beds.patient_start_time at the moment of discharge
    admitted_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- When the nurse pressed "Confirm Discharge"
    discharged_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Derived: discharged_at - admitted_at in milliseconds
    total_duration_ms BIGINT NOT NULL,

    -- Nurse/supervisor who actioned the discharge
    discharged_by_user_id UUID NOT NULL REFERENCES users(id),

    -- Optional free-text notes captured at discharge time
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for per-bed history lookups (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_patient_admissions_bed_id
    ON patient_admissions(bed_id);

-- Index for date-range queries used by analytics / AI reports
CREATE INDEX IF NOT EXISTS idx_patient_admissions_discharged_at
    ON patient_admissions(discharged_at DESC);

-- Index for per-user audit queries
CREATE INDEX IF NOT EXISTS idx_patient_admissions_user_id
    ON patient_admissions(discharged_by_user_id);

COMMENT ON TABLE patient_admissions IS
    'Immutable archive of each completed patient stay. One row per discharge event.';

COMMENT ON COLUMN patient_admissions.admitted_at IS
    'Copied from beds.patient_start_time at discharge time — never recalculated.';

COMMENT ON COLUMN patient_admissions.discharged_at IS
    'Server-side NOW() at the moment the discharge transaction commits.';

COMMENT ON COLUMN patient_admissions.total_duration_ms IS
    'discharged_at − admitted_at in milliseconds. Stored for fast aggregate queries.';

-- Down Migration
-- DROP TABLE IF EXISTS patient_admissions;
