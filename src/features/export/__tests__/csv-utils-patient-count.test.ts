import { describe, it, expect } from 'vitest'
import { generatePatientCountCSV } from '../lib/csv-utils'
import { patientSummary, RANGE_LABEL } from './fixtures'

describe('generatePatientCountCSV', () => {
    it('produces valid CSV with two rows (header + data)', () => {
        const csv = generatePatientCountCSV(patientSummary, RANGE_LABEL)
        const lines = csv.split('\n').filter(Boolean)
        expect(lines).toHaveLength(2)
    })

    it('includes total patients count', () => {
        const csv = generatePatientCountCSV(patientSummary, RANGE_LABEL)
        expect(csv).toContain('"42"')
    })

    it('converts avg duration to minutes (120.0)', () => {
        const csv = generatePatientCountCSV(patientSummary, RANGE_LABEL)
        expect(csv).toContain('"120.0"')
    })

    it('includes shift name', () => {
        const csv = generatePatientCountCSV(patientSummary, RANGE_LABEL)
        expect(csv).toContain('Morning Shift')
    })

    it('handles null avgDurationMs gracefully', () => {
        const csv = generatePatientCountCSV({ ...patientSummary, avgDurationMs: null }, RANGE_LABEL)
        expect(csv).toContain('"N/A"')
    })
})
