'use server'

// Analytics Server Actions
// Purpose: Server-side actions for fetching and analyzing stage transition data
// Epic: EPIC 3 - Time Tracking & Stage Logging

import { requireRole } from '@/shared/lib/auth'
import { logger } from '@/shared/config/logger'
import {
  getStageTransitions,
  getStageDurationStats,
  getBedStageTimeline,
  getBedsSortedByCurrentWaitTime,
  getBedAnalyticsSummary,
  type StageTransitionRecord,
  type StageDurationStats,
  type BedStageTimeline,
} from '../lib/stage-analytics'

/**
 * Fetch stage transitions with optional filters
 * Only nurses, supervisors, and admins can access analytics
 */
export async function fetchStageTransitions(options: {
  startDate?: Date
  endDate?: Date
  bedId?: string
  stageId?: string
}): Promise<{
  success: boolean
  data?: StageTransitionRecord[]
  error?: string
}> {
  try {
    // Require supervisor or admin role for analytics access
    const session = await requireRole(['supervisor', 'admin'])

    const transitions = await getStageTransitions(
      options.startDate,
      options.endDate,
      options.bedId,
      options.stageId
    )

    logger.info('Fetched stage transitions for analytics', {
      userId: session.userId,
      count: transitions.length,
      filters: {
        hasStartDate: !!options.startDate,
        hasEndDate: !!options.endDate,
        bedId: options.bedId ? '***' : undefined,
        stageId: options.stageId ? '***' : undefined,
      },
    })

    return {
      success: true,
      data: transitions,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch stage transitions'
    logger.error('Failed to fetch stage transitions', error as Error)
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Fetch stage duration statistics
 * Shows average, min, max, and percentile times for each stage
 */
export async function fetchStageDurationStats(options?: {
  startDate?: Date
  endDate?: Date
}): Promise<{
  success: boolean
  data?: StageDurationStats[]
  error?: string
}> {
  try {
    // Require supervisor or admin role for analytics access
    const session = await requireRole(['supervisor', 'admin'])

    const stats = await getStageDurationStats(options?.startDate, options?.endDate)

    logger.info('Fetched stage duration statistics', {
      userId: session.userId,
      stageCount: stats.length,
    })

    return {
      success: true,
      data: stats,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch stage statistics'
    logger.error('Failed to fetch stage duration stats', error as Error)
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Fetch complete stage timeline for a specific bed
 */
export async function fetchBedStageTimeline(bedId: string): Promise<{
  success: boolean
  data?: BedStageTimeline
  error?: string
}> {
  try {
    // Require supervisor or admin role for analytics access
    const session = await requireRole(['supervisor', 'admin'])

    const timeline = await getBedStageTimeline(bedId)

    if (!timeline) {
      return {
        success: false,
        error: 'Bed not found',
      }
    }

    logger.info('Fetched bed stage timeline', {
      userId: session.userId,
      bedId,
      transitionCount: timeline.transitions.length,
    })

    return {
      success: true,
      data: timeline,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch bed timeline'
    logger.error('Failed to fetch bed timeline', error as Error)
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Fetch beds currently waiting longest in their current stage
 */
export async function fetchLongestWaitingBeds(limit: number = 10): Promise<{
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
    // Require nurse, supervisor, or admin role
    const session = await requireRole(['nurse', 'supervisor', 'admin'])

    const beds = await getBedsSortedByCurrentWaitTime(limit)

    logger.info('Fetched longest waiting beds', {
      userId: session.userId,
      count: beds.length,
      limit,
    })

    return {
      success: true,
      data: beds,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch waiting beds'
    logger.error('Failed to fetch longest waiting beds', error as Error)
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Fetch analytics summary statistics
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
    // Require supervisor or admin role for full analytics
    const session = await requireRole(['supervisor', 'admin'])

    const summary = await getBedAnalyticsSummary()

    logger.info('Fetched analytics summary', {
      userId: session.userId,
    })

    return {
      success: true,
      data: summary,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch analytics summary'
    logger.error('Failed to fetch analytics summary', error as Error)
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Export stage transitions as CSV
 * For data analysts to download and analyze externally
 */
export async function exportStageTransitionsAsCSV(options?: {
  startDate?: Date
  endDate?: Date
  bedId?: string
  stageId?: string
}): Promise<{
  success: boolean
  data?: string
  error?: string
}> {
  try {
    // Require supervisor or admin role
    const session = await requireRole(['supervisor', 'admin'])

    const transitions = await getStageTransitions(
      options?.startDate,
      options?.endDate,
      options?.bedId,
      options?.stageId
    )

    // Convert to CSV format
    const headers = [
      'ID',
      'Bed Number',
      'From Stage',
      'To Stage',
      'Transition Time',
      'Duration in Previous Stage (ms)',
      'Duration in Current Stage (ms)',
      'Changed By',
      'Notes',
    ]

    const rows = transitions.map((t: StageTransitionRecord) => [
      t.id,
      t.bedNumber,
      t.fromStageName || 'N/A',
      t.toStageName,
      t.transitionTime.toISOString(),
      t.durationInPreviousStageMs?.toString() || 'N/A',
      t.durationInCurrentStageMs?.toString() || 'N/A',
      t.changedByUsername,
      t.notes || '',
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map((cell: string) => `"${cell}"`).join(','))
      .join('\n')

    logger.info('Exported stage transitions as CSV', {
      userId: session.userId,
      count: transitions.length,
    })

    return {
      success: true,
      data: csv,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export data'
    logger.error('Failed to export stage transitions', error as Error)
    return {
      success: false,
      error: message,
    }
  }
}
