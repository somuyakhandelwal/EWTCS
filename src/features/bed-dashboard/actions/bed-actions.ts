'use server'

import { getAllStages, getBedsWithElapsedTime } from '../lib/queries'
import { config } from '@/shared/config/env'
import { logger } from '@/shared/config/logger'
import type { BedGridData } from '../types/bed'
import { UpdateBedStageSchema, type UpdateBedStageInput } from '../schemas/bed-schemas'
import { updateBedStageInDB } from '../lib/bed-mutations'
import { getUserWard, getBedWard } from '../lib/bed-queries'
import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'

/**
 * Update bed stage (US-2.1)
 */
export async function updateBedStage(input: UpdateBedStageInput): Promise<{
  success: boolean
  data?: Awaited<ReturnType<typeof updateBedStageInDB>>
  error?: string
  errors?: Record<string, string[]>
}> {
  try {
    const session = await requireRole(['nurse', 'supervisor', 'admin'])

    const result = UpdateBedStageSchema.safeParse(input)
    if (!result.success) {
      return {
        success: false,
        errors: result.error.flatten().fieldErrors,
      }
    }

    // IDOR FIX: Verify user has access to this specific bed (ward-level access control)
    const userWard = await getUserWard(session.userId)
    const bedWard = await getBedWard(result.data.bedId)

    // Allow access if:
    // 1. Both user and bed have ward assignments and they match, OR
    // 2. User is an admin (admins can access all beds)
    const hasWardAccess =
      (userWard && bedWard && userWard === bedWard) ||
      session.role === 'admin'

    if (!hasWardAccess) {
      logger.warn('Unauthorized bed access attempt', {
        userId: session.userId,
        bedId: result.data.bedId,
        userWard,
        bedWard,
        userRole: session.role,
      })
      return {
        success: false,
        error: 'You do not have permission to update this bed. Access is restricted to your assigned ward.',
      }
    }

    const updateResult = await updateBedStageInDB({
      ...result.data,
      changedByUserId: session.userId,
    })

    await logAudit({
      actionType: 'UPDATE',
      entityType: 'bed',
      entityId: updateResult.bedId,
      performedBy: session.userId,
      changes: {
        fromStageId: updateResult.fromStageId,
        toStageId: updateResult.toStageId,
        isOccupied: updateResult.isOccupied,
      },
    })

    return {
      success: true,
      data: updateResult,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update bed stage'
    logger.error('Failed to update bed stage', error as Error)
    return {
      success: false,
      error: message,
    }
  }
}
/**
 * Get all beds with current status and elapsed time
 * Used by the nurse dashboard to display the bed grid
 */
export async function getBedGridData(): Promise<{
  success: boolean
  data?: BedGridData
  error?: string
}> {
  try {
    logger.info('Fetching bed grid data')
    
    const delayThresholdMs = config.alert.delayThresholdMs

    // Fetch beds and stages in parallel
    const [beds, stages] = await Promise.all([
      getBedsWithElapsedTime(delayThresholdMs),
      getAllStages(),
    ])

    const data: BedGridData = {
      beds,
      stages,
      delayThresholdMs,
    }

    logger.info('Bed grid data fetched successfully', {
      bedCount: beds.length,
      stageCount: stages.length,
      delayedBeds: beds.filter(b => b.isDelayed).length,
    })

    return {
      success: true,
      data,
    }
  } catch (error) {
    logger.error('Failed to fetch bed grid data', error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch bed grid data',
    }
  }
}

/**
 * Get only delayed beds (for filtering)
 */
export async function getDelayedBeds(): Promise<{
  success: boolean
  beds?: Awaited<ReturnType<typeof getBedsWithElapsedTime>>
  error?: string
}> {
  try {
    const delayThresholdMs = config.alert.delayThresholdMs
    const allBeds = await getBedsWithElapsedTime(delayThresholdMs)
    const delayedBeds = allBeds.filter(bed => bed.isDelayed)

    logger.info('Delayed beds fetched', { count: delayedBeds.length })

    return {
      success: true,
      beds: delayedBeds,
    }
  } catch (error) {
    logger.error('Failed to fetch delayed beds', error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch delayed beds',
    }
  }
}

