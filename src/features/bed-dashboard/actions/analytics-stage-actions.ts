'use server'

// Analytics Stage Actions
// Purpose: Server actions for stage transition and duration analytics
// Epic: EPIC 3 - Time Tracking & Stage Logging

import { requireRole } from '@/shared/lib/auth'
import { logger } from '@/shared/config/logger'
import {
  getStageTransitions,
  getStageDurationStats,
  type StageTransitionRecord,
  type StageDurationStats,
} from '../lib/stage-analytics'

/**
 * Fetch stage transitions with optional filters.
 * Supervisors, admins, and auditors can access analytics.
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
    const session = await requireRole(['supervisor', 'admin', 'auditor'])

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

    return { success: true, data: transitions }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch stage transitions'
    logger.error('Failed to fetch stage transitions', error as Error)
    return { success: false, error: message }
  }
}

/**
 * Fetch stage duration statistics.
 * Shows average, min, max, and percentile times for each stage.
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
    const session = await requireRole(['supervisor', 'admin', 'auditor'])

    const stats = await getStageDurationStats(options?.startDate, options?.endDate)

    logger.info('Fetched stage duration statistics', {
      userId: session.userId,
      stageCount: stats.length,
    })

    return { success: true, data: stats }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch stage statistics'
    logger.error('Failed to fetch stage duration stats', error as Error)
    return { success: false, error: message }
  }
}
