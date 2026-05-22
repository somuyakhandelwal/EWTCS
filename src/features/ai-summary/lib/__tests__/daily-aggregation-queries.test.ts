import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/lib/db', () => ({ query: vi.fn() }))
vi.mock('@/shared/config/logger', () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

import { query } from '@/shared/lib/db'
import { aggregateDailyStats, verifyAggregateMatchesMaterializedView } from '../daily-aggregation-queries'

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
            { avgStageTimeMs: '300000' },
            { delayCount: '4' },
            { avgTatMs: '1800000', avgErTatMs: '2100000', avgTriageTatMs: '900000' },
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
        expect(result.metadata.avgErTatMinutes).toBe(35)
        expect(result.metadata.avgTriageTatMinutes).toBe(15)
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
            {}
        )

        const result = await aggregateDailyStats('2026-02-20')
        expect(result.metadata.mostDelayedStage).toBeUndefined()
    })

    it('converts milliseconds to rounded minutes', async () => {
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

    it('uses workflow TAT SQL instead of patient stay duration for daily TAT', async () => {
        mockQuerySequence(
            { totalPatients: '1', totalBedsUsed: '1', totalStageUpdates: '3' },
            { avgStageTimeMs: '60000' },
            { delayCount: '0' },
            { avgTatMs: '600000', avgErTatMs: '600000', avgTriageTatMs: null },
            {}
        )

        await aggregateDailyStats('2026-02-20')

        const tatSql = String(vi.mocked(query).mock.calls[3]?.[0] ?? '')
        expect(tatSql).toContain('er_start_events')
        expect(tatSql).toContain("LOWER(fs.name) = 'empty'")
        expect(tatSql).toContain("LOWER(ts.name) = 'cleaning'")
        expect(tatSql).toContain("LOWER(ts.name) NOT IN ('empty', 'cleaning', 'triage')")
        expect(tatSql).not.toContain('pa.total_duration_ms')
    })

    it('keeps materialized daily summary ER TAT off patient_admissions duration', () => {
        const sql = readFileSync('migrations/1775303000001_update_daily_summary_workflow_tat.sql', 'utf8')

        expect(sql).toContain('er_start_events AS')
        expect(sql).toContain('er_cleaning_events AS')
        expect(sql).not.toContain('pa.total_duration_ms')
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
