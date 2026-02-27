'use server'
// US-2.3: Reset Bed on Patient Discharge
// Epic 2: One-Click Stage Update System
//
// Separated from bed-actions.ts to keep files under the 200-line limit.
// DB query helpers live in ../lib/discharge-queries.ts.

import { requireWriteRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { logger } from '@/shared/config/logger'
import pool from '@/shared/lib/db'
import { checkWardAccess } from '../lib/bed-queries'
import {
  fetchBedForDischarge,
  fetchDischargeStages,
  insertDischargeLogs,
  archiveAndResetBed,
} from '../lib/discharge-queries'

export interface DischargeAndResetResult {
  success: boolean
  error?: string
  admissionId?: string
  totalDurationMs?: number
}

/**
 * Discharge patient and reset bed (US-2.3)
 *
 * In a single transaction:
 *   1. Archives the patient stay to patient_admissions
 *   2. Writes two bed_stage_log entries:
 *      (a) current → Discharge Process  (skipped if already there)
 *      (b) Discharge Process → Cleaning
 *   3. Moves bed to Cleaning, clears patient_start_time
 *   4. Closes any open disposition delay reason
 *
 * Called by DischargeModal after nurse confirms.
 */
export async function dischargeAndResetBed(input: {
  bedId: string
  notes?: string
}): Promise<DischargeAndResetResult> {
  try {
    const session = await requireWriteRole(['nurse', 'supervisor', 'admin'], {
      actionType: 'DISCHARGE',
      entityType: 'bed',
      entityId: input.bedId,
    })

    // Ward-level access check (centralized in checkWardAccess)
    const wardError = await checkWardAccess(session.userId, input.bedId, session.role)
    if (wardError) {
      logger.warn('Unauthorized discharge attempt', {
        userId: session.userId,
        bedId: input.bedId,
        error: wardError
      })
      return { success: false, error: wardError }
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const bed = await fetchBedForDischarge(client, input.bedId)
      if (!bed) throw new Error('Bed not found or inactive')
      if (!bed.isOccupied && !bed.patientStartTime) {
        throw new Error('This bed has no active patient to discharge.')
      }

      const stages = await fetchDischargeStages(client)
      if (!stages) throw new Error('Required stages (Discharge Process, Cleaning) not found.')
      const { dischargeStage, cleaningStage } = stages

      const now = new Date()
      const admittedAt = bed.patientStartTime ?? now
      const totalDurationMs = now.getTime() - new Date(admittedAt).getTime()

      await insertDischargeLogs(client, {
        bedId: input.bedId,
        bed,
        dischargeStageId: dischargeStage.id,
        cleaningStageId: cleaningStage.id,
        changedByUserId: session.userId,
        notes: input.notes ?? null,
        now,
      })

      const admissionId = await archiveAndResetBed(client, {
        bedId: input.bedId,
        admittedAt,
        now,
        totalDurationMs,
        cleaningStageId: cleaningStage.id,
        userId: session.userId,
        notes: input.notes ?? null,
      })

      await client.query('COMMIT')

      // Audit log — outside transaction, failure here is non-fatal
      await logAudit({
        actionType: 'DISCHARGE',
        entityType: 'bed',
        entityId: input.bedId,
        performedBy: session.userId,
        changes: {
          fromStageId: bed.currentStageId,
          fromStageName: bed.currentStageName,
          toStage: 'Cleaning',
          patientAdmittedAt: admittedAt,
          dischargedAt: now,
          totalDurationMs,
          admissionId,
        },
      })

      logger.info('Patient discharged — bed reset to Cleaning', {
        bedId: input.bedId,
        userId: session.userId,
        admissionId,
        totalDurationMs,
      })

      return { success: true, admissionId: admissionId ?? undefined, totalDurationMs }
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to discharge patient'
    logger.error('Discharge failed', error as Error, { bedId: input.bedId })
    return { success: false, error: message }
  }
}
