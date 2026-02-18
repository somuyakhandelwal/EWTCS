// Bed Query Helpers
// Purpose: Reusable query building blocks for bed queries
// Epic: EPIC 1 - Nurse Desk Bed Dashboard

/**
 * Build common bed SELECT statement with stage JSON
 */
export const BED_WITH_STAGE_SELECT = `
  b.id,
  b.bed_number as "bedNumber",
  b.current_stage_id as "currentStageId",
  b.patient_start_time as "patientStartTime",
  b.last_stage_change as "lastStageChange",
  b.is_occupied as "isOccupied",
  b.is_active as "isActive",
  b.metadata,
  b.created_at as "createdAt",
  b.updated_at as "updatedAt",
  json_build_object(
    'id', s.id,
    'name', s.name,
    'displayOrder', s.display_order,
    'colorCode', s.color_code,
    'description', s.description,
    'isActive', s.is_active
  ) as "currentStage"
`
