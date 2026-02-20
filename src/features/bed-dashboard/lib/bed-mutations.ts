// Bed Dashboard Mutations
// Epic 2: One-Click Stage Update System
// Epic 12: Audit Logs & Compliance
//
// COMPLIANCE NOTE: updateBedStageInDB performs atomic bed+audit logging.
// Both the stage transition (bed_stage_logs) and audit entry (audit_logs)
// are recorded within a single database transaction.
// This ensures complete traceability and satisfies compliance requirement:
// "Every user action is logged with user ID, action, timestamp, IP address"
// US-8.2: Auto-tag each stage transition with the active shift

import pool from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import {
  BedRow,
  INSERT_AUDIT_LOG_SQL,
  INSERT_BED_STAGE_LOG_SQL,
  isNonPatientStage,
  SELECT_BED_FOR_UPDATE_SQL,
  SELECT_STAGE_BY_ID_SQL,
  StageRow,
  UPDATE_BED_STAGE_SQL,
} from './bed-mutations.constants'

export interface UpdateBedStageParams {
  bedId: string
  toStageId: string
  changedByUserId: string
  notes?: string
  ipAddress?: string | null
  supervisorOverrideApplied?: boolean
  /** US-8.2: Supervisor manually overrides the auto-resolved shift for this log entry */
  shiftOverrideId?: string | null
  /** User ID of the supervisor performing the override */
  shiftOverrideByUserId?: string | null
}

export interface UpdateBedStageResult {
  bedId: string
  fromStageId: string | null
  toStageId: string
  durationInPreviousStageMs: number | null
  isOccupied: boolean
  patientStartTime: Date | null
  lastStageChange: Date | null
}

export async function updateBedStageInDB(
  params: UpdateBedStageParams
): Promise<UpdateBedStageResult> {
  const {
    bedId,
    toStageId,
    changedByUserId,
    notes,
    ipAddress = null,
    supervisorOverrideApplied = false,
    shiftOverrideId,
    shiftOverrideByUserId,
  } = params
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const bedResult = await client.query<BedRow>(SELECT_BED_FOR_UPDATE_SQL, [bedId])

    if (bedResult.rows.length === 0) {
      throw new Error('Bed not found or inactive')
    }

    const bed = bedResult.rows[0]

    if (bed.currentStageId === toStageId) {
      throw new Error('Bed is already in the selected stage')
    }

    const stageResult = await client.query<StageRow>(SELECT_STAGE_BY_ID_SQL, [toStageId])

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

    // US-3.1: Use CASE to preserve patient_start_time permanently (never cleared)
    // Only set when NULL and bed becomes occupied (non-empty/non-cleaning stage)
    const updateResult = await client.query<{
      patientStartTime: Date | null
      isOccupied: boolean
      lastStageChange: Date | null
    }>(UPDATE_BED_STAGE_SQL, [toStageId, shouldBeUnoccupied, nextIsOccupied, bedId])

    // US-8.2: Auto-tag shift_id using an inline subquery that correctly handles
    // midnight-crossing shifts (e.g. Night: 22:00–06:00 where start_time > end_time).
    // If a supervisor-provided shiftOverrideId is passed, that takes precedence.
    await client.query(INSERT_BED_STAGE_LOG_SQL, [
      bedId,
      bed.currentStageId,
      toStageId,
      changedByUserId,
      durationInPreviousStageMs,
      notes || null,
      shiftOverrideId ?? null,
      shiftOverrideByUserId ?? null,
    ])

    await client.query(INSERT_AUDIT_LOG_SQL, [
      'UPDATE',
      'bed',
      bedId,
      changedByUserId,
      JSON.stringify({
        fromStageId: bed.currentStageId,
        toStageId,
        isOccupied: nextIsOccupied,
        supervisorOverrideApplied,
      }),
      'Bed stage updated',
      JSON.stringify({ source: 'bed-dashboard' }),
      ipAddress,
    ])

    await client.query('COMMIT')

    const updated = updateResult.rows[0]

    return {
      bedId,
      fromStageId: bed.currentStageId,
      toStageId,
      durationInPreviousStageMs,
      isOccupied: updated?.isOccupied ?? nextIsOccupied,
      patientStartTime: updated?.patientStartTime ?? bed.patientStartTime,
      lastStageChange: updated?.lastStageChange ?? bed.lastStageChange,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    logger.error('Failed to update bed stage', error as Error, { bedId, toStageId })
    throw error
  } finally {
    client.release()
  }
}
