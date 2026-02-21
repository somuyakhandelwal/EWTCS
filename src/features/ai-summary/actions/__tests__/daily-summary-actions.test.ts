// Tests — EPIC 9: daily-summary-actions.ts (server actions)
// Verifies generateDailySummary, fetchDailySummaryByDate, fetchRecentDailySummaries,
// and fetchDailySummaryHistory (US-9.5).

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/lib/auth', () => ({ requireRole: vi.fn() }))
vi.mock('@/shared/lib/audit', () => ({ logAudit: vi.fn() }))
vi.mock('@/shared/config/logger', () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))
vi.mock('@/features/ai-summary/lib/daily-aggregation-queries', () => ({
    aggregateDailyStats: vi.fn(),
}))
vi.mock('@/features/ai-summary/lib/ai-service', () => ({
    generateAiSummary: vi.fn(),
}))
vi.mock('@/features/ai-summary/lib/daily-summary-store', () => ({
    upsertDailySummary: vi.fn(),
    getDailySummaryByDate: vi.fn(),
    getRecentDailySummaries: vi.fn(),
    getDailySummariesByDateRange: vi.fn(),
    searchDailySummaries: vi.fn(),
}))

import { requireRole } from '@/shared/lib/auth'
import { aggregateDailyStats } from '@/features/ai-summary/lib/daily-aggregation-queries'
import { generateAiSummary } from '@/features/ai-summary/lib/ai-service'
import {
    upsertDailySummary,
    getDailySummaryByDate,
    getRecentDailySummaries,
    getDailySummariesByDateRange,
    searchDailySummaries,
} from '@/features/ai-summary/lib/daily-summary-store'
import {
    generateDailySummary,
    fetchDailySummaryByDate,
    fetchRecentDailySummaries,
    fetchDailySummaryHistory,
} from '@/features/ai-summary/actions/daily-summary-actions'
import type { DailySummary, DailySummaryInput } from '@/features/ai-summary/types/daily-summary'

const ADMIN_SESSION = { userId: 'admin-1', role: 'admin' }

const SAMPLE_INPUT: DailySummaryInput = {
    summaryDate: '2026-02-20',
    totalPatients: 10,
    avgStageTimeMinutes: 5,
    delayCount: 2,
    avgTatMinutes: 25,
    totalBedsUsed: 12,
    totalStageUpdates: 40,
    metadata: {},
}

const SAVED_SUMMARY: DailySummary = {
    ...SAMPLE_INPUT,
    id: 'summary-uuid',
    generatedAt: '2026-02-21T00:00:00.000Z',
    status: 'draft',
    aiInsights: [],
}

describe('generateDailySummary', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns success with summary on happy path', async () => {
        vi.mocked(requireRole).mockResolvedValue(ADMIN_SESSION as never)
        vi.mocked(aggregateDailyStats).mockResolvedValue(SAMPLE_INPUT)
        vi.mocked(generateAiSummary).mockResolvedValue({ narrative: 'AI Summary Text', insights: [] })
        vi.mocked(upsertDailySummary).mockResolvedValue(SAVED_SUMMARY)

        const result = await generateDailySummary({ date: '2026-02-20' })

        expect(result.success).toBe(true)
        expect(result.date).toBe('2026-02-20')
        expect(generateAiSummary).toHaveBeenCalledWith(SAMPLE_INPUT)
        expect(result.summary?.totalPatients).toBe(10)
    })

    it('defaults to yesterday when no date is supplied', async () => {
        vi.mocked(requireRole).mockResolvedValue(ADMIN_SESSION as never)
        vi.mocked(aggregateDailyStats).mockResolvedValue(SAMPLE_INPUT)
        vi.mocked(generateAiSummary).mockResolvedValue({ narrative: 'AI Summary Text', insights: [] })
        vi.mocked(upsertDailySummary).mockResolvedValue(SAVED_SUMMARY)

        const result = await generateDailySummary({})

        expect(result.success).toBe(true)
        // date will be yesterday's ISO date — just verify it's a date string
        expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(aggregateDailyStats).toHaveBeenCalledWith(result.date)
    })

    it('returns error on invalid date format', async () => {
        vi.mocked(requireRole).mockResolvedValue(ADMIN_SESSION as never)

        const result = await generateDailySummary({ date: 'not-a-date' })

        expect(result.success).toBe(false)
        expect(result.error).toMatch(/YYYY-MM-DD/i)
    })

    it('returns error when role is insufficient', async () => {
        vi.mocked(requireRole).mockRejectedValue(new Error('Unauthorized: Required role(s): admin'))

        const result = await generateDailySummary({ date: '2026-02-20' })

        expect(result.success).toBe(false)
        expect(result.error).toMatch(/unauthorized/i)
    })

    it('returns error when aggregateDailyStats throws', async () => {
        vi.mocked(requireRole).mockResolvedValue(ADMIN_SESSION as never)
        vi.mocked(aggregateDailyStats).mockRejectedValue(new Error('db timeout'))

        const result = await generateDailySummary({ date: '2026-02-20' })

        expect(result.success).toBe(false)
        expect(result.error).toBe('db timeout')
    })
})

describe('fetchDailySummaryByDate', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns summary when it exists', async () => {
        vi.mocked(requireRole).mockResolvedValue(ADMIN_SESSION as never)
        vi.mocked(getDailySummaryByDate).mockResolvedValue(SAVED_SUMMARY)

        const result = await fetchDailySummaryByDate('2026-02-20')

        expect(result.success).toBe(true)
        expect(result.summary?.id).toBe('summary-uuid')
    })

    it('returns null summary when nothing generated yet', async () => {
        vi.mocked(requireRole).mockResolvedValue(ADMIN_SESSION as never)
        vi.mocked(getDailySummaryByDate).mockResolvedValue(null)

        const result = await fetchDailySummaryByDate('2026-02-19')

        expect(result.success).toBe(true)
        expect(result.summary).toBeNull()
    })

    it('returns error when role check fails', async () => {
        vi.mocked(requireRole).mockRejectedValue(new Error('Unauthorized'))

        const result = await fetchDailySummaryByDate('2026-02-20')

        expect(result.success).toBe(false)
        expect(result.error).toBe('Unauthorized')
    })
})

describe('fetchRecentDailySummaries', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns array of summaries', async () => {
        vi.mocked(requireRole).mockResolvedValue(ADMIN_SESSION as never)
        vi.mocked(getRecentDailySummaries).mockResolvedValue([SAVED_SUMMARY])

        const result = await fetchRecentDailySummaries(1)

        expect(result.success).toBe(true)
        expect(result.summaries).toHaveLength(1)
        expect(result.summaries?.[0].id).toBe('summary-uuid')
    })

    it('returns empty array when no summaries exist', async () => {
        vi.mocked(requireRole).mockResolvedValue(ADMIN_SESSION as never)
        vi.mocked(getRecentDailySummaries).mockResolvedValue([])

        const result = await fetchRecentDailySummaries()

        expect(result.success).toBe(true)
        expect(result.summaries).toEqual([])
    })

    it('returns error on db failure', async () => {
        vi.mocked(requireRole).mockResolvedValue(ADMIN_SESSION as never)
        vi.mocked(getRecentDailySummaries).mockRejectedValue(new Error('query failed'))

        const result = await fetchRecentDailySummaries()

        expect(result.success).toBe(false)
        expect(result.error).toBe('query failed')
    })
})

const SAVED_SUMMARY_PUB: DailySummary = {
    id: 'pub-uuid',
    summaryDate: '2026-02-20',
    totalPatients: 10,
    avgStageTimeMinutes: 5,
    delayCount: 2,
    avgTatMinutes: 25,
    totalBedsUsed: 12,
    totalStageUpdates: 40,
    generatedAt: '2026-02-21T00:00:00.000Z',
    status: 'published',
    reviewedBy: 'supervisor-1',
    reviewedAt: '2026-02-21T08:00:00.000Z',
    aiInsights: [],
    metadata: {},
}

describe('fetchDailySummaryHistory', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns summaries via date range on happy path', async () => {
        vi.mocked(requireRole).mockResolvedValue(ADMIN_SESSION as never)
        vi.mocked(getDailySummariesByDateRange).mockResolvedValue([SAVED_SUMMARY_PUB])

        const result = await fetchDailySummaryHistory({
            from: '2026-02-01',
            to: '2026-02-20',
        })

        expect(result.success).toBe(true)
        expect(result.summaries).toHaveLength(1)
        expect(getDailySummariesByDateRange).toHaveBeenCalledWith(
            '2026-02-01', '2026-02-20', 'all'
        )
    })

    it('uses searchDailySummaries when search is provided', async () => {
        vi.mocked(requireRole).mockResolvedValue(ADMIN_SESSION as never)
        vi.mocked(searchDailySummaries).mockResolvedValue([SAVED_SUMMARY_PUB])

        const result = await fetchDailySummaryHistory({ search: 'bottleneck' })

        expect(result.success).toBe(true)
        expect(searchDailySummaries).toHaveBeenCalledWith('bottleneck', 90, 'all')
        expect(getDailySummariesByDateRange).not.toHaveBeenCalled()
    })

    it('auditor always gets published-only filter', async () => {
        const auditorSession = { userId: 'auditor-1', role: 'auditor' }
        vi.mocked(requireRole).mockResolvedValue(auditorSession as never)
        vi.mocked(getDailySummariesByDateRange).mockResolvedValue([])

        await fetchDailySummaryHistory({})

        expect(getDailySummariesByDateRange).toHaveBeenCalledWith(
            expect.any(String), expect.any(String), 'published'
        )
    })

    it('returns validation error for invalid date format', async () => {
        vi.mocked(requireRole).mockResolvedValue(ADMIN_SESSION as never)

        const result = await fetchDailySummaryHistory({ from: 'not-a-date' })

        expect(result.success).toBe(false)
        expect(result.error).toMatch(/YYYY-MM-DD/i)
    })

    it('returns validation error when from > to', async () => {
        vi.mocked(requireRole).mockResolvedValue(ADMIN_SESSION as never)

        const result = await fetchDailySummaryHistory({
            from: '2026-02-20',
            to: '2026-02-01',
        })

        expect(result.success).toBe(false)
        expect(result.error).toMatch(/from.*before.*to/i)
    })

    it('returns error when role check fails', async () => {
        vi.mocked(requireRole).mockRejectedValue(new Error('Unauthorized'))

        const result = await fetchDailySummaryHistory({})

        expect(result.success).toBe(false)
        expect(result.error).toBe('Unauthorized')
    })
})
