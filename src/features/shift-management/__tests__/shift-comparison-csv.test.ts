// Tests — shift-management/lib/shift-comparison-csv.ts

import { describe, it, expect, vi } from 'vitest'
import { rowsToCsv } from '../lib/shift-comparison-csv'
import type { ShiftPerformanceRow } from '@/shared/types/report.types'

vi.mock('../lib/shift-format', () => ({
    formatShiftTime: (_s: string, _e: string) => '08:00-16:00',
}))

const BASE_ROW: ShiftPerformanceRow = {
    shiftId: 'sh-1',
    shiftName: 'Morning',
    startTime: '08:00',
    endTime: '16:00',
    patientsTreated: 12,
    avgTatMs: 1_800_000, // 30 min
    delayCount: 2,
    crossesMidnight: false,
}

describe('rowsToCsv', () => {
    it('includes header row', () => {
        const csv = rowsToCsv([])
        expect(csv).toContain('Shift')
        expect(csv).toContain('Time Range')
        expect(csv).toContain('Patients Treated')
    })

    it('quotes all cell values (RFC-4180)', () => {
        const csv = rowsToCsv([BASE_ROW])
        // Every data cell should be wrapped in double-quotes
        const dataLine = csv.split('\n')[1]
        expect(dataLine).toMatch(/^"/)
        expect(dataLine.split('","').length).toBeGreaterThan(1)
    })

    it('escapes inner double-quotes in cell values', () => {
        const rowWithQuotes: ShiftPerformanceRow = {
            ...BASE_ROW,
            shiftName: 'Night "Late"',
        }
        const csv = rowsToCsv([rowWithQuotes])
        expect(csv).toContain('"Night ""Late"""')
    })

    it('does not corrupt CSV when shift name contains a comma', () => {
        const rowWithComma: ShiftPerformanceRow = {
            ...BASE_ROW,
            shiftName: 'Night, Late',
        }
        const csv = rowsToCsv([rowWithComma])
        // The comma inside the name should be inside quotes — column count should still be 5
        const dataLine = csv.split('\n')[1]
        // Count commas outside quotes — should be 4 (5 columns)
        const outsideCommas = dataLine.replace(/"[^"]*"/g, '').split(',').length - 1
        expect(outsideCommas).toBe(4)
    })

    it('renders N/A for null avgTatMs', () => {
        const csv = rowsToCsv([{ ...BASE_ROW, avgTatMs: null }])
        expect(csv).toContain('"N/A"')
    })
})
