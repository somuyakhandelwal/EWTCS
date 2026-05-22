'use server'

import { requireWriteRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { logger } from '@/shared/config/logger'
import { updateBedStageInDB } from '../lib/bed-mutations'
import { getAllStages } from '../lib/queries'
import { resolveActiveShiftIdCached } from '@/shared/lib/shift-helpers'

export async function markBedClean(bedId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const session = await requireWriteRole('beds', {
      actionType: 'UPDATE',
      entityType: 'bed',
      entityId: bedId,
    })

    const allStages = await getAllStages()
    const emptyStage = allStages.find((stage) => stage.name.trim().toLowerCase() === 'empty')
    if (!emptyStage) {
      return { success: false, error: 'Empty stage not found in system' }
    }

    const activeShiftId = await resolveActiveShiftIdCached()
    const result = await updateBedToEmpty({
      bedId,
      userId: session.userId,
      stageId: emptyStage.id,
      stageName: emptyStage.name,
      activeShiftId,
    })

    if (!result) return { success: true }

    await logAudit({
      actionType: 'UPDATE',
      entityType: 'bed',
      entityId: bedId,
      performedBy: session.userId,
      changes: {
        action: 'mark_clean',
        fromStageId: result.fromStageId,
        toStageId: result.toStageId,
      },
      reason: 'Bed cleaning completed',
    })

    logger.info('Bed marked clean', { bedId, changedBy: session.userId })
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to mark bed as clean'
    logger.error('Failed to mark bed clean', error as Error, { bedId })
    return { success: false, error: message }
  }
}

async function updateBedToEmpty(params: {
  bedId: string
  userId: string
  stageId: string
  stageName: string
  activeShiftId: string | null
}) {
  try {
    return await updateBedStageInDB({
      bedId: params.bedId,
      toStageId: params.stageId,
      toStageName: params.stageName,
      changedByUserId: params.userId,
      notes: 'Bed marked clean - ready for next patient',
      activeShiftId: params.activeShiftId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message === 'Bed is already in the selected stage') {
      logger.info('Bed already clean; mark clean treated as no-op', {
        bedId: params.bedId,
        changedBy: params.userId,
      })
      return null
    }
    throw error
  }
}
