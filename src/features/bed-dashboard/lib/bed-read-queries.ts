import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { Bed } from '../types/bed'

const TRIAGE_INFO_METADATA_PROJECTION = `
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

const CURRENT_STAGE_PROJECTION = `
  json_build_object(
    'id', s.id,
    'name', s.name,
    'displayOrder', s.display_order,
    'colorCode', s.color_code,
    'description', s.description,
    'isActive', s.is_active
  ) as "currentStage"
`

/** Get all active beds with current stage information */
export async function getAllBeds(): Promise<Bed[]> {
  try {
    const result = await query<Bed>(`
      SELECT
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
        b.updated_at as "updatedAt",
        ${CURRENT_STAGE_PROJECTION}
      FROM beds b
      LEFT JOIN stages s ON b.current_stage_id = s.id
      WHERE b.is_active = true
      ORDER BY b.bed_number ASC
    `)

    return result.rows
  } catch (error) {
    logger.error('Failed to fetch beds', error as Error)
    throw new Error('Failed to fetch beds from database')
  }
}

/** Get bed by ID */
export async function getBedById(bedId: string): Promise<Bed | null> {
  try {
    const result = await query<Bed>(
      `
      SELECT
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
        b.updated_at as "updatedAt",
        ${CURRENT_STAGE_PROJECTION}
      FROM beds b
      LEFT JOIN stages s ON b.current_stage_id = s.id
      WHERE b.id = $1 AND b.is_active = true
      LIMIT 1
      `,
      [bedId]
    )

    return result.rows[0] || null
  } catch (error) {
    logger.error('Failed to fetch bed', error as Error, { bedId })
    throw new Error('Failed to fetch bed from database')
  }
}

/** Get bed by bed number */
export async function getBedByNumber(bedNumber: string): Promise<Bed | null> {
  try {
    const result = await query<Bed>(
      `
      SELECT
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
      FROM beds b
      WHERE b.bed_number = $1 AND b.is_active = true
      LIMIT 1
      `,
      [bedNumber]
    )

    return result.rows[0] || null
  } catch (error) {
    logger.error('Failed to fetch bed by number', error as Error, { bedNumber })
    throw new Error('Failed to fetch bed from database')
  }
}
