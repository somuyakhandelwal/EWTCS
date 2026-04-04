// Tests — EPIC 9: daily-aggregation-queries.ts
// Mocks the db `query` helper and tests the aggregateDailyStats composer.

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/lib/db', () => ({ query: vi.fn() }))
vi.mock('@/shared/config/logger', () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

import { query } from '@/shared/lib/db'
import {
    aggregateDailyStats,
    verifyAggregateMatchesMaterializedView,
} from '../daily-aggregation-queries'

// Helper: build the 5 successive mock query results expected by aggregateDailyStats.
// Order matches Promise.all in the source: patients, avgStageTime, delays, tat, mostDelayedStage.
function mockQuerySequence(
    patients: object,
    avgStage: object,
    delays: object,
    tat: object,
    stage: object
) {
    const m = vi.mocked(query)
    m.mockResolvedValueOnce({ rows: [patients] } as never)
    m.mockResolvedValueOnce({ rows: [avgStage] } as never)
    m.mockResolvedValueOnce({ rows: [delays] } as never)
    m.mockResolvedValueOnce({ rows: [tat] } as never)
    m.mockResolvedValueOnce({ rows: [stage] } as never)
}

describe('aggregateDailyStats', () => {
    beforeEach(() => vi.clearAllMocks())

    it('maps a normal day correctly', async () => {
        mockQuerySequence(
            { totalPatients: '15', totalBedsUsed: '18', totalStageUpdates: '72' },
            { avgStageTimeMs: '300000' },   // 5 min
            { delayCount: '4' },
            { avgTatMs: '1800000' },        // 30 min
            { stageName: 'Discharge' }
        )

        const result = await aggregateDailyStats('2026-02-20')

        expect(result.summaryDate).toBe('2026-02-20')
        expect(result.totalPatients).toBe(15)
        expect(result.totalBedsUsed).toBe(18)
        expect(result.totalStageUpdates).toBe(72)
        expect(result.avgStageTimeMinutes).toBe(5)
        expect(result.delayCount).toBe(4)
        expect(result.avgTatMinutes).toBe(30)
        expect(result.metadata.mostDelayedStage).toBe('Discharge')
    })

    it('returns 0 for avgStageTimeMinutes when no stage-time rows', async () => {
        mockQuerySequence(
            { totalPatients: '5', totalBedsUsed: '5', totalStageUpdates: '10' },
            { avgStageTimeMs: null },
            { delayCount: '0' },
            { avgTatMs: null },
            {}
        )

        const result = await aggregateDailyStats('2026-02-20')

        expect(result.avgStageTimeMinutes).toBe(0)
        expect(result.avgTatMinutes).toBe(0)
    })

    it('returns 0 for delayCount when no delay rows', async () => {
        mockQuerySequence(
            { totalPatients: '3', totalBedsUsed: '3', totalStageUpdates: '9' },
            { avgStageTimeMs: '60000' },
            { delayCount: '0' },
            { avgTatMs: '600000' },
            {}
        )

        const result = await aggregateDailyStats('2026-02-20')
        expect(result.delayCount).toBe(0)
    })

    it('leaves mostDelayedStage undefined when no delay stage found', async () => {
        mockQuerySequence(
            { totalPatients: '2', totalBedsUsed: '2', totalStageUpdates: '4' },
            { avgStageTimeMs: '120000' },
            { delayCount: '0' },
            { avgTatMs: '240000' },
            {}           // empty row — stageName is undefined
        )

        const result = await aggregateDailyStats('2026-02-20')
        expect(result.metadata.mostDelayedStage).toBeUndefined()
    })

    it('converts milliseconds to rounded minutes', async () => {
        // 90 001 ms → 1.50 min (rounded 2dp)
        mockQuerySequence(
            { totalPatients: '1', totalBedsUsed: '1', totalStageUpdates: '1' },
            { avgStageTimeMs: '90001' },
            { delayCount: '0' },
            { avgTatMs: '90001' },
            {}
        )

        const result = await aggregateDailyStats('2026-02-20')
        expect(result.avgStageTimeMinutes).toBe(1.5)
        expect(result.avgTatMinutes).toBe(1.5)
    })

    it('propagates db errors', async () => {
        vi.mocked(query).mockRejectedValueOnce(new Error('connection refused'))
        await expect(aggregateDailyStats('2026-02-20')).rejects.toThrow('connection refused')
    })
})

describe('verifyAggregateMatchesMaterializedView', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns matches=true when aggregate equals materialized view row', async () => {
        mockQuerySequence(
            { totalPatients: '15', totalBedsUsed: '18', totalStageUpdates: '72' },
            { avgStageTimeMs: '300000' },
            { delayCount: '4' },
            { avgTatMs: '1800000' },
            { stageName: 'Discharge' }
        )
        vi.mocked(query).mockResolvedValueOnce({
            rows: [{
                summary_date: '2026-02-20',
                total_patients: '15',
                avg_stage_time_minutes: '5.00',
                delay_count: '4',
                avg_tat_minutes: '30.00',
                total_beds_used: '18',
                total_stage_updates: '72',
            }],
        } as never)

        const result = await verifyAggregateMatchesMaterializedView('2026-02-20')
        expect(result.matches).toBe(true)
        expect(result.mismatches).toEqual([])
    })

    it('returns mismatch details when values differ', async () => {
        mockQuerySequence(
            { totalPatients: '15', totalBedsUsed: '18', totalStageUpdates: '72' },
            { avgStageTimeMs: '300000' },
            { delayCount: '4' },
            { avgTatMs: '1800000' },
            { stageName: 'Discharge' }
        )
        vi.mocked(query).mockResolvedValueOnce({
            rows: [{
                summary_date: '2026-02-20',
                total_patients: '11',
                avg_stage_time_minutes: '5.00',
                delay_count: '4',
                avg_tat_minutes: '30.00',
                total_beds_used: '18',
                total_stage_updates: '65',
            }],
        } as never)

        const result = await verifyAggregateMatchesMaterializedView('2026-02-20')
        expect(result.matches).toBe(false)
        expect(result.mismatches).toContain('totalPatients')
        expect(result.mismatches).toContain('totalStageUpdates')
    })
})
