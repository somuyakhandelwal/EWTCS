import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mocks must be declared before imports of the modules under test
vi.mock('@/shared/lib/auth', () => ({ requireRole: vi.fn() }))
vi.mock('@/shared/lib/audit', () => ({ logAudit: vi.fn() }))
vi.mock('@/shared/config/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@/features/adoption/lib/usage-queries', () => ({
    fetchUsageMetrics: vi.fn(),
    fetchLoginTrend: vi.fn(),
    fetchMonthlyUsageSummary: vi.fn(),
    fetchLowUsageUsers: vi.fn(),
}))

import { requireRole } from '@/shared/lib/auth'
import {
    fetchUsageMetrics,
    fetchLoginTrend,
    fetchMonthlyUsageSummary,
    fetchLowUsageUsers,
} from '@/features/adoption/lib/usage-queries'
import {
    getUsageMetrics,
    getLoginTrend,
    getMonthlyUsageSummary,
    getLowUsageUsers,
} from '@/features/adoption/actions/usage-actions'
import type { UsageMetrics, LoginTrendPoint, MonthlyUsageSummary, LowUsageUser } from '@/features/adoption/types'

const ADMIN_SESSION = { userId: 'admin-uuid-1', role: 'admin' }

const MOCK_METRICS: UsageMetrics = {
    loginsToday: 3,
    loginsThisWeek: 12,
    loginsThisMonth: 45,
    bedUpdatesToday: 20,
    bedUpdatesThisWeek: 80,
    bedUpdatesThisMonth: 310,
    reportsGeneratedThisMonth: 5,
    activeUsersThisMonth: 8,
    totalUsers: 10,
}

const MOCK_TREND: LoginTrendPoint[] = [
    { date: '2026-02-01', logins: 5 },
    { date: '2026-02-02', logins: 8 },
]

const MOCK_MONTHLY: MonthlyUsageSummary[] = [
    { month: '2026-01', totalLogins: 120, uniqueUsers: 8, bedUpdates: 450, reportsGenerated: 10 },
    { month: '2026-02', totalLogins: 95, uniqueUsers: 7, bedUpdates: 380, reportsGenerated: 8 },
]

const MOCK_LOW_USAGE: LowUsageUser[] = [
    { userId: 'user-1', username: 'nurse2', role: 'nurse', lastLogin: null, daysSinceLogin: null },
]

describe('usage-actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // -----------------------------------------------------------------------
    // getUsageMetrics
    // -----------------------------------------------------------------------
    describe('getUsageMetrics', () => {
        it('returns metrics for admin user', async () => {
            vi.mocked(requireRole).mockResolvedValue(ADMIN_SESSION as never)
            vi.mocked(fetchUsageMetrics).mockResolvedValue(MOCK_METRICS)

            const result = await getUsageMetrics()

            expect(result.success).toBe(true)
            expect(result.data).toEqual(MOCK_METRICS)
        })

        it('returns error when auth fails', async () => {
            vi.mocked(requireRole).mockRejectedValue(new Error('Unauthorized'))

            const result = await getUsageMetrics()

            expect(result.success).toBe(false)
            expect(result.error).toBe('Failed to load usage metrics')
            expect(fetchUsageMetrics).not.toHaveBeenCalled()
        })

        it('returns error when DB query fails', async () => {
            vi.mocked(requireRole).mockResolvedValue(ADMIN_SESSION as never)
            vi.mocked(fetchUsageMetrics).mockRejectedValue(new Error('DB error'))

            const result = await getUsageMetrics()

            expect(result.success).toBe(false)
            expect(result.error).toBe('Failed to load usage metrics')
        })
    })

    // -----------------------------------------------------------------------
    // getLoginTrend
    // -----------------------------------------------------------------------
    describe('getLoginTrend', () => {
        it('returns trend data for admin', async () => {
            vi.mocked(requireRole).mockResolvedValue(ADMIN_SESSION as never)
            vi.mocked(fetchLoginTrend).mockResolvedValue(MOCK_TREND)

            const result = await getLoginTrend()

            expect(result.success).toBe(true)
            expect(result.data).toHaveLength(2)
            expect(result.data?.[0].date).toBe('2026-02-01')
        })

        it('blocks non-admin', async () => {
            vi.mocked(requireRole).mockRejectedValue(new Error('Unauthorized'))

            const result = await getLoginTrend()

            expect(result.success).toBe(false)
            expect(fetchLoginTrend).not.toHaveBeenCalled()
        })
    })

    // -----------------------------------------------------------------------
    // getMonthlyUsageSummary
    // -----------------------------------------------------------------------
    describe('getMonthlyUsageSummary', () => {
        it('returns 6-month summary for admin', async () => {
            vi.mocked(requireRole).mockResolvedValue(ADMIN_SESSION as never)
            vi.mocked(fetchMonthlyUsageSummary).mockResolvedValue(MOCK_MONTHLY)

            const result = await getMonthlyUsageSummary()

            expect(result.success).toBe(true)
            expect(result.data).toHaveLength(2)
            expect(result.data?.[0].month).toBe('2026-01')
        })
    })

    // -----------------------------------------------------------------------
    // getLowUsageUsers
    // -----------------------------------------------------------------------
    describe('getLowUsageUsers', () => {
        it('returns users who have not logged in', async () => {
            vi.mocked(requireRole).mockResolvedValue(ADMIN_SESSION as never)
            vi.mocked(fetchLowUsageUsers).mockResolvedValue(MOCK_LOW_USAGE)

            const result = await getLowUsageUsers(7)

            expect(result.success).toBe(true)
            expect(result.data).toHaveLength(1)
            expect(result.data?.[0].username).toBe('nurse2')
        })

        it('passes threshold to query function', async () => {
            vi.mocked(requireRole).mockResolvedValue(ADMIN_SESSION as never)
            vi.mocked(fetchLowUsageUsers).mockResolvedValue([])

            await getLowUsageUsers(14)

            expect(fetchLowUsageUsers).toHaveBeenCalledWith(14)
        })

        it('returns empty array when all users are active', async () => {
            vi.mocked(requireRole).mockResolvedValue(ADMIN_SESSION as never)
            vi.mocked(fetchLowUsageUsers).mockResolvedValue([])

            const result = await getLowUsageUsers()

            expect(result.success).toBe(true)
            expect(result.data).toEqual([])
        })

        it('returns error when auth fails', async () => {
            vi.mocked(requireRole).mockRejectedValue(new Error('Unauthorized'))

            const result = await getLowUsageUsers()

            expect(result.success).toBe(false)
            expect(result.error).toBe('Failed to load low-usage users')
        })
    })
})
