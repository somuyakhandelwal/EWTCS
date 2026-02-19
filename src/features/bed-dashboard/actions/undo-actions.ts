// Undo Actions for Bed Stage
// US-7: Undo Last Action (Nurse)

import { getBedById } from '../lib/queries'
import { logger } from '@/shared/config/logger'
import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { updateBedStageInDB } from '../lib/bed-mutations'

/**
 * Undo the last stage update for a bed (within 30 seconds, only by the same nurse)
 * @param bedId - Bed to undo
 * @param prevStageId - Previous stage to revert to
 */
export async function undoLastBedStageUpdate({ bedId, prevStageId }: { bedId: string; prevStageId: string }) {
  try {
    const session = await requireRole(['nurse', 'supervisor', 'admin'])
    const bed = await getBedById(bedId)
    if (!bed) {
      return { success: false, error: 'Bed not found' }
    }
    // Only allow undo if the user is the one who performed the last update (to be enforced in audit log check)
    // Only allow undo within 30 seconds (to be enforced in audit log check)
    // TODO: Query audit log for last UPDATE action on this bed
    // For now, allow all (add real checks in production)
    if (bed.currentStageId === prevStageId) {
      return { success: false, error: 'Bed is already in the previous stage' }
    }
    // Revert to previous stage
    const updateResult = await updateBedStageInDB({
      bedId,
      toStageId: prevStageId,
      changedByUserId: session.userId,
      notes: 'Undo last action',
    })
    await logAudit({
      actionType: 'UNDO',
      entityType: 'bed',
      entityId: bedId,
      performedBy: session.userId,
      changes: {
        fromStageId: bed.currentStageId,
        toStageId: prevStageId,
        undo: true,
      },
    })
    return { success: true, data: updateResult }
  } catch (error) {
    logger.error('Failed to undo last bed stage update', error as Error, { bedId, prevStageId })
    return { success: false, error: 'Failed to undo last action' }
  }
}
