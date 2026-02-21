import { describe, it, expect } from 'vitest'
import { generateDelayedPatientsCSV } from '../lib/csv-utils'
import { delaySummary, RANGE_LABEL } from './fixtures'

describe('generateDelayedPatientsCSV', () => {
    it('includes summary + blank line + trend header + trend rows', () => {
        const csv = generateDelayedPatientsCSV(delaySummary, RANGE_LABEL)
        expect(csv).toContain('Daily Trend')
        expect(csv).toContain('2026-01-22')
        expect(csv).toContain('2026-01-23')
    })

    it('encodes delay percentage correctly', () => {
        const csv = generateDelayedPatientsCSV(delaySummary, RANGE_LABEL)
        expect(csv).toContain('"30.0"')
    })

    it('shows target pct when set', () => {
        const csv = generateDelayedPatientsCSV(delaySummary, RANGE_LABEL)
        expect(csv).toContain('"20.0"')
    })

    it('shows "Not Set" when target is null', () => {
        const csv = generateDelayedPatientsCSV(
            { ...delaySummary, targetPct: null },
            RANGE_LABEL
        )
        expect(csv).toContain('Not Set')
    })

    it('trend rows include all columns', () => {
        const csv = generateDelayedPatientsCSV(delaySummary, RANGE_LABEL)
        const lines = csv.split('\n').filter(Boolean)
        expect(lines.length).toBeGreaterThan(5)
    })
})
