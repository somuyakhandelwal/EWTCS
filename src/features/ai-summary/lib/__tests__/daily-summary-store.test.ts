// Tests — EPIC 9: daily-summary-store.ts
// Verifies mapping, upsert, and read operations against a mocked db query helper.

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/lib/db', () => ({ query: vi.fn() }))
vi.mock('@/shared/config/logger', () => ({
    logger: { info: vi.fn(), error: vi.fn() },
}))

import { query } from '@/shared/lib/db'
import {
    upsertDailySummary,
    getDailySummaryByDate,
    getRecentDailySummaries,
    getDailySummariesByDateRange,
    searchDailySummaries,
} from '../daily-summary-store'
import type { DailySummaryInput } from '../../types/daily-summary'

const SAMPLE_INPUT: DailySummaryInput = {
    summaryDate: '2026-02-20',
    totalPatients: 15,
    avgStageTimeMinutes: 5.25,
    delayCount: 3,
    avgTatMinutes: 28.5,
    totalBedsUsed: 18,
    totalStageUpdates: 72,
    metadata: { mostDelayedStage: 'Discharge' },
}

const RAW_ROW = {
    id: 'uuid-123',
    summary_date: '2026-02-20',
    total_patients: '15',
    avg_stage_time_minutes: '5.25',
    delay_count: '3',
    avg_tat_minutes: '28.5',
    total_beds_used: '18',
    total_stage_updates: '72',
    generated_at: '2026-02-21T00:00:00.000Z',
    ai_summary: 'Sample AI summary',
    metadata: { mostDelayedStage: 'Discharge' },
    status: 'draft',
    ai_insights: [],
}

describe('upsertDailySummary', () => {
    beforeEach(() => vi.clearAllMocks())

    it('maps raw row to DailySummary correctly', async () => {
        vi.mocked(query).mockResolvedValueOnce({ rows: [RAW_ROW] } as never)

        const result = await upsertDailySummary(SAMPLE_INPUT)

        expect(result.id).toBe('uuid-123')
        expect(result.summaryDate).toBe('2026-02-20')
        expect(result.totalPatients).toBe(15)
        expect(result.avgStageTimeMinutes).toBe(5.25)
        expect(result.delayCount).toBe(3)
        expect(result.avgTatMinutes).toBe(28.5)
        expect(result.totalBedsUsed).toBe(18)
        expect(result.totalStageUpdates).toBe(72)
        expect(result.metadata.mostDelayedStage).toBe('Discharge')
    })

    it('throws when db returns no row', async () => {
        vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never)

        await expect(upsertDailySummary(SAMPLE_INPUT)).rejects.toThrow(
            'Upsert returned no row — database error'
        )
    })

    it('propagates db error', async () => {
        vi.mocked(query).mockRejectedValueOnce(new Error('db offline'))

        await expect(upsertDailySummary(SAMPLE_INPUT)).rejects.toThrow('db offline')
    })
})

describe('getDailySummaryByDate', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns mapped DailySummary when row exists', async () => {
        vi.mocked(query).mockResolvedValueOnce({ rows: [RAW_ROW] } as never)

        const result = await getDailySummaryByDate('2026-02-20')

        expect(result).not.toBeNull()
        expect(result?.summaryDate).toBe('2026-02-20')
        expect(result?.totalPatients).toBe(15)
    })

    it('returns null when no row exists', async () => {
        vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never)

        const result = await getDailySummaryByDate('2026-02-19')
        expect(result).toBeNull()
    })

    it('prefers reviewed_by_display when present', async () => {
        vi.mocked(query).mockResolvedValueOnce({
            rows: [{
                ...RAW_ROW,
                status: 'published',
                reviewed_by: '8b2f2586-8d63-49ca-b271-08cd7ecb170b',
                reviewed_by_display: 'supervisor01',
            }],
        } as never)

        const result = await getDailySummaryByDate('2026-02-20')

        expect(result?.reviewedBy).toBe('supervisor01')
    })
})

describe('getRecentDailySummaries', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns an array of mapped summaries', async () => {
        vi.mocked(query).mockResolvedValueOnce({
            rows: [RAW_ROW, { ...RAW_ROW, id: 'uuid-456', summary_date: '2026-02-19' }],
        } as never)

        const results = await getRecentDailySummaries(2)

        expect(results).toHaveLength(2)
        expect(results[0].summaryDate).toBe('2026-02-20')
        expect(results[1].summaryDate).toBe('2026-02-19')
    })

    it('returns empty array when no summaries exist', async () => {
        vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never)

        const results = await getRecentDailySummaries()
        expect(results).toEqual([])
    })
})

describe('getDailySummariesByDateRange', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns mapped summaries for a valid date range', async () => {
        vi.mocked(query).mockResolvedValueOnce({ rows: [RAW_ROW] } as never)

        const results = await getDailySummariesByDateRange('2026-02-01', '2026-02-20')

        expect(results).toHaveLength(1)
        expect(results[0].summaryDate).toBe('2026-02-20')
        expect(query).toHaveBeenCalledWith(
            expect.stringContaining('BETWEEN'),
            expect.arrayContaining(['2026-02-01', '2026-02-20'])
        )
    })

    it('passes status param when statusFilter is not all', async () => {
        vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never)

        await getDailySummariesByDateRange('2026-02-01', '2026-02-20', 'published')

        expect(query).toHaveBeenCalledWith(
            expect.stringContaining('status'),
            expect.arrayContaining(['2026-02-01', '2026-02-20', 'published'])
        )
    })

    it('returns empty array when no rows match', async () => {
        vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never)

        const results = await getDailySummariesByDateRange('2025-01-01', '2025-01-31')
        expect(results).toEqual([])
    })
})

describe('searchDailySummaries', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns matching rows for search text', async () => {
        vi.mocked(query).mockResolvedValueOnce({ rows: [RAW_ROW] } as never)

        const results = await searchDailySummaries('bottleneck')

        expect(results).toHaveLength(1)
        expect(query).toHaveBeenCalledWith(
            expect.stringContaining('ILIKE'),
            expect.arrayContaining(['%bottleneck%'])
        )
    })

    it('restricts to published when statusFilter is published', async () => {
        vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never)

        await searchDailySummaries('delay', 10, 'published')

        expect(query).toHaveBeenCalledWith(
            expect.stringContaining('status'),
            expect.arrayContaining(['%delay%', 10, 'published'])
        )
    })

    it('returns empty array when nothing matches', async () => {
        vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never)

        const results = await searchDailySummaries('xyznotfound')
        expect(results).toEqual([])
    })
})
