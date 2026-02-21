import { describe, it, expect } from 'vitest'
import { generateStageDelayCSV } from '../lib/csv-utils'
import { stageReport, RANGE_LABEL } from './fixtures'

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

    it('handles null median and p90 gracefully', () => {
        const report = {
            ...stageReport,
            rows: [{ ...stageReport.rows[0], medianDurationMs: null, p90DurationMs: null }],
        }
        const csv = generateStageDelayCSV(report, RANGE_LABEL)
        expect(csv).toContain('"N/A"')
    })
})
