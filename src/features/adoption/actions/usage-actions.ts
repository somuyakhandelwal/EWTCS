'use server'

import { logger } from '@/shared/config/logger'
import { requireRole } from '@/shared/lib/auth'
import {
    fetchUsageMetrics,
    fetchLoginTrend,
    fetchMonthlyUsageSummary,
    fetchLowUsageUsers,
} from '@/features/adoption/lib/usage-queries'
import type {
    UsageMetrics,
    LoginTrendPoint,
    MonthlyUsageSummary,
    LowUsageUser,
} from '@/features/adoption/types'

// ---------------------------------------------------------------------------
// getUsageMetrics — admin only
// ---------------------------------------------------------------------------

export async function getUsageMetrics(): Promise<{
    success: boolean
    data?: UsageMetrics
    error?: string
}> {
    try {
        await requireRole('admin')
        const data = await fetchUsageMetrics()
        return { success: true, data }
    } catch (error) {
        logger.error('getUsageMetrics failed', error as Error)
        return { success: false, error: 'Failed to load usage metrics' }
    }
}

// ---------------------------------------------------------------------------
// getLoginTrend — admin only
// ---------------------------------------------------------------------------

export async function getLoginTrend(): Promise<{
    success: boolean
    data?: LoginTrendPoint[]
    error?: string
}> {
    try {
        await requireRole('admin')
        const data = await fetchLoginTrend()
        return { success: true, data }
    } catch (error) {
        logger.error('getLoginTrend failed', error as Error)
        return { success: false, error: 'Failed to load login trend' }
    }
}

// ---------------------------------------------------------------------------
// getMonthlyUsageSummary — admin only
// ---------------------------------------------------------------------------

export async function getMonthlyUsageSummary(): Promise<{
    success: boolean
    data?: MonthlyUsageSummary[]
    error?: string
}> {
    try {
        await requireRole('admin')
        const data = await fetchMonthlyUsageSummary()
        return { success: true, data }
    } catch (error) {
        logger.error('getMonthlyUsageSummary failed', error as Error)
        return { success: false, error: 'Failed to load monthly summary' }
    }
}

// ---------------------------------------------------------------------------
// getLowUsageUsers — admin only
// ---------------------------------------------------------------------------

export async function getLowUsageUsers(thresholdDays = 7): Promise<{
    success: boolean
    data?: LowUsageUser[]
    error?: string
}> {
    try {
        await requireRole('admin')
        const data = await fetchLowUsageUsers(thresholdDays)
        return { success: true, data }
    } catch (error) {
        logger.error('getLowUsageUsers failed', error as Error)
        return { success: false, error: 'Failed to load low-usage users' }
    }
}
