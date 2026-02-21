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
    metadata: { mostDelayedStage: 'Discharge' },
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
