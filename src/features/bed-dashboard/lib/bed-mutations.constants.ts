import { SHIFT_AUTOTAG_SUBQUERY } from '@/shared/lib/shift-helpers'

export type BedRow = {
  id: string
  currentStageId: string | null
  lastStageChange: Date | null
  patientStartTime: Date | null
  isOccupied: boolean
}

export type StageRow = {
  id: string
  name: string
}

export function isNonPatientStage(stageName: string): boolean {
  const normalized = stageName.trim().toLowerCase()
  return normalized === 'empty' || normalized === 'cleaning'
}

export const SELECT_BED_FOR_UPDATE_SQL = `
  SELECT
    id,
    current_stage_id as "currentStageId",
    last_stage_change as "lastStageChange",
    patient_start_time as "patientStartTime",
    is_occupied as "isOccupied"
  FROM beds
  WHERE id = $1 AND is_active = true
  FOR UPDATE
`

export const SELECT_STAGE_BY_ID_SQL = `
  SELECT id, name
  FROM stages
  WHERE id = $1 AND is_active = true
`

export const UPDATE_BED_STAGE_SQL = `
  UPDATE beds
  SET current_stage_id = $1,
      last_stage_change = NOW(),
      patient_start_time = CASE
        WHEN $2 THEN NULL
        WHEN patient_start_time IS NULL THEN NOW()
        ELSE patient_start_time
      END,
      is_occupied = $3,
      updated_at = NOW()
  WHERE id = $4
  RETURNING patient_start_time as "patientStartTime", is_occupied as "isOccupied", last_stage_change as "lastStageChange"
`

export const INSERT_BED_STAGE_LOG_SQL = `
  INSERT INTO bed_stage_logs (
    bed_id,
    from_stage_id,
    to_stage_id,
    changed_by_user_id,
    duration_in_previous_stage_ms,
    notes,
    shift_id,
    shift_override_by_user_id
  ) VALUES (
    $1, $2, $3, $4, $5, $6,
    COALESCE(
      $7::uuid,
      ${SHIFT_AUTOTAG_SUBQUERY}
    ),
    $8::uuid
  )
`

export const INSERT_AUDIT_LOG_SQL = `
  INSERT INTO audit_logs (
    action_type,
    entity_type,
    entity_id,
    performed_by_user_id,
    changes,
    reason,
    metadata,
    ip_address
  ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8)
`