import { describe, it, expect } from 'vitest'
import { generateAuditorHistoryCSV } from '../lib/csv-generators'

describe('generateAuditorHistoryCSV', () => {
  it('includes expected headers', () => {
    const csv = generateAuditorHistoryCSV([])

    expect(csv).toContain('ID')
    expect(csv).toContain('Bed Number')
    expect(csv).toContain('Changed By User ID')
    expect(csv).toContain('Changed By Username')
  })

  it('renders row values and fallbacks correctly', () => {
    const csv = generateAuditorHistoryCSV([
      {
        id: 'log-1',
        bedNumber: 'ER-01',
        fromStageName: null,
        toStageName: 'Doctor Assessment',
        transitionTime: '2026-02-19T08:00:00.000Z',
        changedByUserId: 'user-123',
        changedByUsername: 'nurse1',
        durationInPreviousStageMs: null,
        notes: null,
      },
    ])

    expect(csv).toContain('"log-1"')
    expect(csv).toContain('"ER-01"')
    expect(csv).toContain('"N/A"')
    expect(csv).toContain('"user-123"')
    expect(csv).toContain('"nurse1"')
  })
})