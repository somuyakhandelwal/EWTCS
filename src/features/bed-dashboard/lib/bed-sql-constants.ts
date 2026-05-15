/**
 * Shared SQL projection constants for bed dashboard queries.
 * DB6-01: Single source of truth — imported by bed-read-queries.ts
 * and bed-bottleneck-queries.ts
 */

/**
 * TRIAGE_INFO_METADATA_PROJECTION
 * Builds the metadata JSONB column including triageInfo if any triage
 * fields are present on the bed row. Aliased as "metadata".
 * Used in: bed-read-queries.ts, bed-bottleneck-queries.ts
 */
export const TRIAGE_INFO_METADATA_PROJECTION = `
  CASE
    WHEN b.patient_uhid IS NOT NULL
      OR b.patient_ipd_id IS NOT NULL
      OR b.patient_name IS NOT NULL
      OR b.patient_age IS NOT NULL
      OR b.patient_gender IS NOT NULL
      OR b.key_symptom IS NOT NULL
      OR b.triage_category IS NOT NULL
    THEN jsonb_set(
      COALESCE(b.metadata, '{}'::jsonb),
      '{triageInfo}',
      jsonb_strip_nulls(jsonb_build_object(
        'patientUhid', b.patient_uhid,
        'patientIpdId', b.patient_ipd_id,
        'patientName', b.patient_name,
        'patientAge', b.patient_age,
        'patientGender', b.patient_gender,
        'keySymptom', b.key_symptom,
        'triageCategory', b.triage_category
      )),
      true
    )
    ELSE b.metadata
  END as "metadata"
`

/**
 * BED_SELECT_PROJECTION
 * Standard SELECT columns for the beds table (aliased for TypeScript).
 * Used in: getAllBeds(), getBedById(), getBedByNumber()
 */
export const BED_SELECT_PROJECTION = `
  b.id,
  b.bed_number as "bedNumber",
  b.current_stage_id as "currentStageId",
  b.patient_start_time as "patientStartTime",
  b.last_stage_change as "lastStageChange",
  b.is_occupied as "isOccupied",
  b.is_active as "isActive",
  b.is_temporary as "isTemporary",
  b.is_virtual as "isVirtual",
  ${TRIAGE_INFO_METADATA_PROJECTION},
  b.created_at as "createdAt",
  b.updated_at as "updatedAt"
`

/**
 * CURRENT_STAGE_PROJECTION
 * Builds the currentStage JSON object from the joined stages row.
 * Used in: getAllBeds(), getBedById()
 */
export const CURRENT_STAGE_PROJECTION = `
  json_build_object(
    'id', s.id,
    'name', s.name,
    'displayOrder', s.display_order,
    'colorCode', s.color_code,
    'description', s.description,
    'isActive', s.is_active
  ) as "currentStage"
`
