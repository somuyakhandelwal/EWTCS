// Bed Dashboard Server Actions
// Epic 1: Nurse Desk Bed Dashboard

'use server'

import { getAllStages, getBedsWithElapsedTime } from '../lib/queries'
import { config } from '@/shared/config/env'
import { logger } from '@/shared/config/logger'
import type { BedGridData } from '../types/bed'

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
