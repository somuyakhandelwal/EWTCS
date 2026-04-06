// Undo Actions for Bed Stage
// US-7: Undo Last Action (Nurse)

import { getAllStages, getBedById } from '../lib/queries'
import { logger } from '@/shared/config/logger'
import { requireWriteRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { updateBedStageInDB } from '../lib/bed-mutations'
import { query } from '@/shared/lib/db'
import { resolveActiveShiftIdCached } from '@/shared/lib/shift-helpers'

const UNDO_WINDOW_MS = 30 * 1000

interface LatestTransition {
  id: string
  fromStageId: string | null
  toStageId: string
  changedByUserId: string
  transitionTime: Date
}

/**
 * Undo the last stage update for a bed (within 30 seconds, only by the same nurse)
 * @param bedId - Bed to undo
 */
export async function undoLastBedStageUpdate({ bedId }: { bedId: string }) {
  try {
    const session = await requireWriteRole('beds', {
      actionType: 'UNDO',
      entityType: 'bed',
      entityId: bedId,
    })
    const bed = await getBedById(bedId)
    if (!bed) {
      return { success: false, error: 'Bed not found' }
    }

    const latestTransitionResult = await query<LatestTransition>(
      `
      SELECT
        id,
        from_stage_id as "fromStageId",
        to_stage_id as "toStageId",
        changed_by_user_id as "changedByUserId",
        transition_time as "transitionTime"
      FROM bed_stage_logs
      WHERE bed_id = $1
      ORDER BY transition_time DESC
      LIMIT 1
      `,
      [bedId]
    )

    const latestTransition = latestTransitionResult.rows[0]
    if (!latestTransition) {
      return { success: false, error: 'No stage transition found to undo' }
    }

    if (latestTransition.changedByUserId !== session.userId) {
      return { success: false, error: 'Only the user who made the last change can undo it' }
    }

    const elapsedMs = Date.now() - new Date(latestTransition.transitionTime).getTime()
    if (elapsedMs > UNDO_WINDOW_MS) {
      return { success: false, error: 'Undo window expired (30 seconds)' }
    }

    if (!latestTransition.fromStageId) {
      return { success: false, error: 'Cannot undo initial stage assignment' }
    }

    if (bed.currentStageId !== latestTransition.toStageId) {
      return { success: false, error: 'Bed stage has changed; undo no longer valid' }
    }

    if (bed.currentStageId === latestTransition.fromStageId) {
      return { success: false, error: 'Bed is already in the previous stage' }
    }

    const allStages = await getAllStages()
    const targetStage = allStages.find((stage) => stage.id === latestTransition.fromStageId)
    if (!targetStage) {
      return { success: false, error: 'Stage not found or inactive' }
    }

    const activeShiftId = await resolveActiveShiftIdCached()

    // Revert to previous stage
    const updateResult = await updateBedStageInDB({
      bedId,
      toStageId: latestTransition.fromStageId,
      toStageName: targetStage.name,
      changedByUserId: session.userId,
      notes: 'Undo last action',
      activeShiftId,
    })
    await logAudit({
      actionType: 'UNDO',
      entityType: 'bed',
      entityId: bedId,
      performedBy: session.userId,
      changes: {
        fromStageId: latestTransition.toStageId,
        toStageId: latestTransition.fromStageId,
        undoneTransitionId: latestTransition.id,
        undo: true,
      },
    })
    return { success: true, data: updateResult }
  } catch (error) {
    logger.error('Failed to undo last bed stage update', error as Error, { bedId })
    return { success: false, error: 'Failed to undo last action' }
  }
}
