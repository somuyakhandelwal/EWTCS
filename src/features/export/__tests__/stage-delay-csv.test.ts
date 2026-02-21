import { describe, it, expect } from 'vitest'
import { generateStageDelayCSV } from '../lib/csv-utils'
import { stageReport, RANGE_LABEL } from './fixtures'
import type { StageDelayReport } from '@/features/management-report/types/report.types'

describe('generateStageDelayCSV', () => {
    it('includes one row per stage', () => {
        const csv = generateStageDelayCSV(stageReport, RANGE_LABEL)
        expect(csv).toContain('Triage')
        expect(csv).toContain('Awaiting Doctor')
    })

    it('flags bottleneck stage as Yes', () => {
        const csv = generateStageDelayCSV(stageReport, RANGE_LABEL)
        expect(csv).toContain('"Yes"')
    })

    it('includes avg duration in minutes (15.0 for 900_000 ms)', () => {
        const csv = generateStageDelayCSV(stageReport, RANGE_LABEL)
        expect(csv).toContain('"15.0"')
    })

    it('handles null median and p90 gracefully', () => {
        const report: StageDelayReport = {
            ...stageReport,
            rows: [{ ...stageReport.rows[0], medianDurationMs: null, p90DurationMs: null }],
        }
        const csv = generateStageDelayCSV(report, RANGE_LABEL)
        expect(csv).toContain('"N/A"')
    })

    it('includes range label', () => {
        const csv = generateStageDelayCSV(stageReport, RANGE_LABEL)
        expect(csv).toContain(RANGE_LABEL)
    })
})
