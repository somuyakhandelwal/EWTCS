'use server'

import { requireRole } from '@/shared/lib/auth'
import { logger } from '@/shared/config/logger'
import {
    getStageDurationStats,
    getBedsSortedByCurrentWaitTime,
    getBedAnalyticsSummary,
    type StageDurationStats,
} from '../lib/stage-analytics'

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
