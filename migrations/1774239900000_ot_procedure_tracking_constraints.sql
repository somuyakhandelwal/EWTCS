-- Migration: OT procedure tracking constraints and nurse-compatible creation
-- Purpose: US-23.2 Surgery Procedure Tracking
-- 1) Allow procedure logging without immediate surgeon assignment
-- 2) Enforce single active OT procedure per room

ALTER TABLE ot_procedures
  ALTER COLUMN surgeon_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ot_procedures_one_active_per_room
  ON ot_procedures(ot_id)
  WHERE status = 'IN_PROGRESS';
