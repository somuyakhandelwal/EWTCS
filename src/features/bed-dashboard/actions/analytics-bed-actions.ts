'use server'

// Analytics Bed Actions
// Purpose: Server actions for per-bed analytics and summary reporting
// Epic: EPIC 3 - Time Tracking & Stage Logging

import { requireRole } from '@/shared/lib/auth'
import { logger } from '@/shared/config/logger'
import {
  getBedStageTimeline,
  getBedsSortedByCurrentWaitTime,
  getBedAnalyticsSummary,
  type BedStageTimeline,
} from '../lib/stage-analytics'

/**
 * Fetch complete stage timeline for a specific bed.
 */
export async function fetchBedStageTimeline(bedId: string): Promise<{
  success: boolean
  data?: BedStageTimeline
  error?: string
}> {
  try {
    const session = await requireRole(['supervisor', 'admin'])

    const timeline = await getBedStageTimeline(bedId)

    if (!timeline) {
      return { success: false, error: 'Bed not found' }
    }

    logger.info('Fetched bed stage timeline', {
      userId: session.userId,
      bedId,
      transitionCount: timeline.transitions.length,
    })

    return { success: true, data: timeline }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch bed timeline'
    logger.error('Failed to fetch bed timeline', error as Error)
    return { success: false, error: message }
  }
}

/**
 * Fetch beds currently waiting longest in their current stage.
 */
export async function fetchLongestWaitingBeds(limit = 10): Promise<{
  success: boolean
  data?: Array<{
    bedNumber: string
    bedId: string
    currentStageName: string
    currentStageId: string
    waitTimeMs: number
    transitionTime: Date
  }>
  error?: string
}> {
  try {
    const session = await requireRole(['nurse', 'supervisor', 'admin'])

    const beds = await getBedsSortedByCurrentWaitTime(limit)

    logger.info('Fetched longest waiting beds', {
      userId: session.userId,
      count: beds.length,
      limit,
    })

    return { success: true, data: beds }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch waiting beds'
    logger.error('Failed to fetch longest waiting beds', error as Error)
    return { success: false, error: message }
  }
}

/**
 * Fetch analytics summary statistics.
 */
export async function fetchAnalyticsSummary(): Promise<{
  success: boolean
  data?: {
    totalBedsUsed: number
    totalTransitions: number
    averageTimePerPatientMs: number
    averageTransitionsPerPatient: number
    totalPatientsProcessed: number
  }
  error?: string
}> {
  try {
    const session = await requireRole(['supervisor', 'admin'])

    const summary = await getBedAnalyticsSummary()

    logger.info('Fetched analytics summary', { userId: session.userId })

    return { success: true, data: summary }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch analytics summary'
    logger.error('Failed to fetch analytics summary', error as Error)
    return { success: false, error: message }
  }
}
