import { describe, it, expect } from 'vitest'
import { generateBedPerformanceCSV } from '../lib/csv-utils'
import { bedReport, RANGE_LABEL } from './fixtures'

describe('generateBedPerformanceCSV', () => {
    it('produces one row per bed plus meta and header rows', () => {
        const csv = generateBedPerformanceCSV(bedReport, RANGE_LABEL)
        expect(csv).toContain('ER-01')
        expect(csv).toContain('ER-02')
    })

    it('flags outlier bed as Yes', () => {
        const csv = generateBedPerformanceCSV(bedReport, RANGE_LABEL)
        expect(csv).toContain('"Yes"')
    })

    it('converts durations from ms to minutes', () => {
        const csv = generateBedPerformanceCSV(bedReport, RANGE_LABEL)
        expect(csv).toContain('"90.0"')
    })
})
