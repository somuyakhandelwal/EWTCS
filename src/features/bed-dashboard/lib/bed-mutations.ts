// Bed Dashboard Mutations
// Epic 2: One-Click Stage Update System

import pool from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'

type BedRow = {
  id: string
  currentStageId: string | null
  lastStageChange: Date | null
  patientStartTime: Date | null
  isOccupied: boolean
}

type StageRow = {
  id: string
  name: string
}

export interface UpdateBedStageParams {
  bedId: string
  toStageId: string
  changedByUserId: string
  notes?: string
}

export interface UpdateBedStageResult {
  bedId: string
  fromStageId: string | null
  toStageId: string
  durationInPreviousStageMs: number | null
  isOccupied: boolean
  patientStartTime: Date | null
}

function isNonPatientStage(stageName: string): boolean {
  const normalized = stageName.trim().toLowerCase()
  return normalized === 'empty' || normalized === 'cleaning'
}

export async function updateBedStageInDB(
  params: UpdateBedStageParams
): Promise<UpdateBedStageResult> {
  const { bedId, toStageId, changedByUserId, notes } = params
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const bedResult = await client.query<BedRow>(
      `
      SELECT 
        id,
        current_stage_id as "currentStageId",
        last_stage_change as "lastStageChange",
        patient_start_time as "patientStartTime",
        is_occupied as "isOccupied"
      FROM beds
      WHERE id = $1 AND is_active = true
      FOR UPDATE
      `,
      [bedId]
    )

    if (bedResult.rows.length === 0) {
      throw new Error('Bed not found or inactive')
    }

    const bed = bedResult.rows[0]

    if (bed.currentStageId === toStageId) {
      throw new Error('Bed is already in the selected stage')
    }

    const stageResult = await client.query<StageRow>(
      `
      SELECT id, name
      FROM stages
      WHERE id = $1 AND is_active = true
      `,
      [toStageId]
    )

    if (stageResult.rows.length === 0) {
      throw new Error('Stage not found or inactive')
    }

    const stage = stageResult.rows[0]

    const now = Date.now()
    const durationInPreviousStageMs = bed.lastStageChange
      ? now - new Date(bed.lastStageChange).getTime()
      : null

    const shouldBeUnoccupied = isNonPatientStage(stage.name)
    const nextIsOccupied = !shouldBeUnoccupied
    const nextPatientStartTime = shouldBeUnoccupied
      ? null
      : bed.patientStartTime || new Date(now)

    await client.query(
      `
      UPDATE beds
      SET current_stage_id = $1,
          last_stage_change = NOW(),
          patient_start_time = $2,
          is_occupied = $3,
          updated_at = NOW()
      WHERE id = $4
      `,
      [toStageId, nextPatientStartTime, nextIsOccupied, bedId]
    )

    await client.query(
      `
      INSERT INTO bed_stage_logs (
        bed_id,
        from_stage_id,
        to_stage_id,
        changed_by_user_id,
        duration_in_previous_stage_ms,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        bedId,
        bed.currentStageId,
        toStageId,
        changedByUserId,
        durationInPreviousStageMs,
        notes || null,
      ]
    )

    await client.query('COMMIT')

    return {
      bedId,
      fromStageId: bed.currentStageId,
      toStageId,
      durationInPreviousStageMs,
      isOccupied: nextIsOccupied,
      patientStartTime: nextPatientStartTime,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    logger.error('Failed to update bed stage', error as Error, { bedId, toStageId })
    throw error
  } finally {
    client.release()
  }
}
