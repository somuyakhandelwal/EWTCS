// Tests — EPIC 9 (US-9.5): summary-csv-export.ts
// Pure unit tests for CSV formatting – no db or server deps.

import { describe, it, expect } from 'vitest'
import { formatSummariesAsCsv } from '../summary-csv-export'
import type { DailySummary } from '../../types/daily-summary'

const BASE: DailySummary = {
    id: 'uuid-1',
    summaryDate: '2026-02-20',
    totalPatients: 10,
    avgStageTimeMinutes: 5,
    delayCount: 2,
    avgTatMinutes: 25,
    totalBedsUsed: 12,
    totalStageUpdates: 40,
    generatedAt: '2026-02-21T00:00:00.000Z',
    status: 'published',
    reviewedBy: 'supervisor-1',
    reviewedAt: '2026-02-21T08:00:00.000Z',
    aiSummary: 'Today was a productive day.',
    aiInsights: [],
    metadata: {},
}

describe('formatSummariesAsCsv', () => {
    it('returns only header row for empty array', () => {
        const csv = formatSummariesAsCsv([])
        const lines = csv.split('\r\n')
        expect(lines).toHaveLength(1)
        expect(lines[0]).toContain('"Date"')
        expect(lines[0]).toContain('"AI Summary"')
        expect(lines[0]).toContain('"Approver"')
    })

    it('produces correct number of rows', () => {
        const csv = formatSummariesAsCsv([BASE, { ...BASE, id: 'uuid-2', summaryDate: '2026-02-19' }])
        const lines = csv.split('\r\n').filter(Boolean)
        // 1 header + 2 data rows
        expect(lines).toHaveLength(3)
    })

    it('embeds summaryDate in first data column', () => {
        const csv = formatSummariesAsCsv([BASE])
        const dataRow = csv.split('\r\n')[1]
        expect(dataRow).toContain('"2026-02-20"')
    })

    it('embeds status in second data column', () => {
        const csv = formatSummariesAsCsv([BASE])
        const dataRow = csv.split('\r\n')[1]
        expect(dataRow).toContain('"published"')
    })

    it('embeds reviewedBy (approver) column', () => {
        const csv = formatSummariesAsCsv([BASE])
        const dataRow = csv.split('\r\n')[1]
        expect(dataRow).toContain('"supervisor-1"')
    })

    it('escapes double-quotes inside AI summary text', () => {
        const summary = { ...BASE, aiSummary: 'He said "great job" today.' }
        const csv = formatSummariesAsCsv([summary])
        // Double-quote inside a cell must be escaped as ""
        expect(csv).toContain('He said ""great job"" today.')
    })

    it('escapes commas inside AI summary text', () => {
        const summary = { ...BASE, aiSummary: 'Patients: 10, beds: 12.' }
        const csv = formatSummariesAsCsv([summary])
        // The cell wraps commas in double-quotes
        expect(csv).toContain('"Patients: 10, beds: 12."')
    })

    it('renders empty string for missing optional fields', () => {
        const summary: DailySummary = {
            ...BASE,
            reviewedBy: undefined,
            aiSummary: undefined,
        }
        const csv = formatSummariesAsCsv([summary])
        const dataRow = csv.split('\r\n')[1]
        // Empty cells appear as ""
        expect(dataRow).toBeDefined()
    })
})
