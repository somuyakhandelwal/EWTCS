import { describe, it, expect } from 'vitest'
import { parseCSV } from '../lib/csv-parser'
import { HistoricalAdmissionSchema } from '../types/import.types'

describe('CSV Parser', () => {
    it('should parse simple CSV rows', () => {
        const csv = 'bed_number,admitted_at,discharged_at,discharged_by_username,notes\nER-01,2024-01-01T10:00:00Z,2024-01-01T12:00:00Z,admin,Test note'
        const results = parseCSV(csv)
        expect(results).toHaveLength(1)
        expect(results[0].bed_number).toBe('ER-01')
        expect(results[0].discharged_by_username).toBe('admin')
    })

    it('should handle quoted values and escaped quotes', () => {
        const csv = 'bed_number,notes\nER-01,"Note with , comma"\nER-02,"Note with ""escaped"" quotes"'
        const results = parseCSV(csv)
        expect(results).toHaveLength(2)
        expect(results[0].notes).toBe('Note with , comma')
        expect(results[1].notes).toBe('Note with "escaped" quotes')
    })

    it('should return empty array for empty input', () => {
        expect(parseCSV('')).toHaveLength(0)
        expect(parseCSV('header1,header2')).toHaveLength(0)
    })

    it('should ignore extra columns not in the header', () => {
        const csv = 'bed_number,notes\nER-01,Note,Extra Column Value'
        const results = parseCSV(csv)
        expect(results).toHaveLength(1)
        expect(results[0].bed_number).toBe('ER-01')
        expect(results[0].notes).toBe('Note')
    })

    it('should handle rows with missing values', () => {
        const csv = 'bed_number,admitted_at,discharged_at,discharged_by_username,notes\nER-01,,,admin,'
        const results = parseCSV(csv)
        expect(results).toHaveLength(1)
        expect(results[0].admitted_at).toBeNull()
        expect(results[0].notes).toBeNull()
    })
})

describe('HistoricalAdmissionSchema', () => {
    const validRow = {
        bed_number: 'ER-01',
        admitted_at: '2024-01-01T10:00:00Z',
        discharged_at: '2024-01-01T12:00:00Z',
        discharged_by_username: 'admin',
        notes: 'Everything fine'
    }

    it('should validate a correct row', () => {
        const result = HistoricalAdmissionSchema.safeParse(validRow)
        expect(result.success).toBe(true)
    })

    it('should fail if discharged_at is before admitted_at', () => {
        const invalidRow = {
            ...validRow,
            admitted_at: '2024-01-01T12:00:00Z',
            discharged_at: '2024-01-01T10:00:00Z'
        }
        const result = HistoricalAdmissionSchema.safeParse(invalidRow)
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toContain('Discharge time must be after admission time')
        }
    })

    it('should fail on invalid date formats', () => {
        const invalidRow = {
            ...validRow,
            admitted_at: 'not-a-date'
        }
        const result = HistoricalAdmissionSchema.safeParse(invalidRow)
        expect(result.success).toBe(false)
    })

    it('should require mandatory fields', () => {
        const invalidRow = {
            bed_number: '',
            admitted_at: '2024-01-01T10:00:00Z'
        }
        const result = HistoricalAdmissionSchema.safeParse(invalidRow)
        expect(result.success).toBe(false)
    })

    it('should handle Unicode characters in notes', () => {
        const unicodeRow = {
            ...validRow,
            notes: 'Patient feels fine. 😊 🏥'
        }
        const result = HistoricalAdmissionSchema.safeParse(unicodeRow)
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.notes).toBe('Patient feels fine. 😊 🏥')
        }
    })

    it('should handle long notes', () => {
        const longNoteRow = {
            ...validRow,
            notes: 'a'.repeat(500)
        }
        const result = HistoricalAdmissionSchema.safeParse(longNoteRow)
        expect(result.success).toBe(true)
    })
})
