'use server'

import { getAllStages, getBedsWithElapsedTime, getBedById } from '../lib/queries'
import { config } from '@/shared/config/env'
import { logger } from '@/shared/config/logger'
import type { BedGridData } from '../types/bed'
import { getUserWard, getBedWard } from '../lib/bed-queries'
import { requireRole } from '@/shared/lib/auth'
import { categorizeStagesForTransition } from '../lib/stage-validation'

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
    // Auth guard: all roles can fetch the dashboard, but must be authenticated
    await requireRole(['nurse', 'supervisor', 'admin'])

    logger.info('Fetching bed grid data')

    const delayThresholdMs = config.alert.delayThresholdMs

    // Fetch beds and stages in parallel
    const [beds, stages] = await Promise.all([
      getBedsWithElapsedTime(delayThresholdMs),
      getAllStages(),
    ])

    const bottleneckCount = beds.filter(b => b.isDispositionBottleneck).length

    const data: BedGridData = {
      beds,
      stages,
      delayThresholdMs,
      bottleneckCount,
    }

    logger.info('Bed grid data fetched successfully', {
      bedCount: beds.length,
      stageCount: stages.length,
      delayedBeds: beds.filter(b => b.isDelayed).length,
      bottleneckBeds: bottleneckCount,
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

/**
 * Get valid stage transitions for a specific bed (US-2.2)
 * Returns categorized stages for UI display (allowed, requires override, invalid)
 */
export async function getValidTransitionsForBed(bedId: string): Promise<{
  success: boolean
  allowed?: string[]
  requiresOverride?: string[]
  invalid?: string[]
  error?: string
}> {
  try {
    const session = await requireRole(['nurse', 'supervisor', 'admin'])

    // Verify user has access to this bed — mirrors the same logic in bed-actions.ts
    const userWard = await getUserWard(session.userId)
    const bedWard = await getBedWard(bedId)

    const hasWardAccess =
      session.role === 'admin' ||
      (!userWard && !bedWard) ||
      (userWard && bedWard && userWard === bedWard)

    if (!hasWardAccess) {
      return {
        success: false,
        error: 'Access denied to this bed',
      }
    }

    // Get the bed to find current stage
    const bed = await getBedById(bedId)
    if (!bed) {
      return {
        success: false,
        error: 'Bed not found',
      }
    }

    // Get all stages
    const allStages = await getAllStages()
    const allStageIds = allStages.map(s => s.id)

    // Categorize stages based on transition rules
    const categorized = await categorizeStagesForTransition(
      bed.currentStageId,
      allStageIds,
      session.role as 'nurse' | 'supervisor' | 'admin'
    )

    logger.info('Valid transitions fetched for bed', {
      bedId,
      role: session.role,
      allowed: categorized.allowed.length,
      requiresOverride: categorized.requiresOverride.length,
      invalid: categorized.invalid.length,
    })

    return {
      success: true,
      allowed: categorized.allowed,
      requiresOverride: categorized.requiresOverride,
      invalid: categorized.invalid,
    }
  } catch (error) {
    logger.error('Failed to get valid transitions for bed', error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get valid transitions',
    }
  }
}
