// Tests — EPIC 9 (US-9.5): history-query.ts schema validation
// Covers all Zod rules: date format, from≤to refinement, defaults, and limits.

import { describe, it, expect } from 'vitest'
import { historyQuerySchema } from '../history-query'

describe('historyQuerySchema', () => {
    it('accepts an empty input and applies defaults', () => {
        const result = historyQuerySchema.safeParse({})
        expect(result.success).toBe(true)
        if (!result.success) return
        // 'all' and 90 are the documented defaults
        expect(result.data.status).toBe('all')
        expect(result.data.limit).toBe(90)
    })

    it('accepts a valid date range with all optional fields', () => {
        const result = historyQuerySchema.safeParse({
            from: '2026-01-01',
            to: '2026-02-20',
            search: 'bottleneck',
            status: 'published',
            limit: 30,
        })
        expect(result.success).toBe(true)
        if (!result.success) return
        expect(result.data.from).toBe('2026-01-01')
        expect(result.data.to).toBe('2026-02-20')
        expect(result.data.search).toBe('bottleneck')
        expect(result.data.status).toBe('published')
        expect(result.data.limit).toBe(30)
    })

    it('accepts status values: draft, published, rejected, all', () => {
        for (const status of ['all', 'published', 'draft', 'rejected'] as const) {
            const result = historyQuerySchema.safeParse({ status })
            expect(result.success).toBe(true)
        }
    })

    it('rejects an invalid status value', () => {
        const result = historyQuerySchema.safeParse({ status: 'approved' })
        expect(result.success).toBe(false)
    })

    it('rejects a date not in YYYY-MM-DD format', () => {
        const result = historyQuerySchema.safeParse({ from: '21-02-2026' })
        expect(result.success).toBe(false)
        if (result.success) return
        expect(result.error.issues[0].message).toMatch(/YYYY-MM-DD/i)
    })

    it('rejects from > to (from must be on or before to)', () => {
        const result = historyQuerySchema.safeParse({
            from: '2026-02-20',
            to: '2026-02-01',
        })
        expect(result.success).toBe(false)
        if (result.success) return
        expect(result.error.issues[0].message).toMatch(/from.*before.*to/i)
    })

    it('accepts from === to (same-day range is valid)', () => {
        const result = historyQuerySchema.safeParse({
            from: '2026-02-15',
            to: '2026-02-15',
        })
        expect(result.success).toBe(true)
    })

    it('rejects search text longer than 200 characters', () => {
        const result = historyQuerySchema.safeParse({ search: 'a'.repeat(201) })
        expect(result.success).toBe(false)
        if (result.success) return
        expect(result.error.issues[0].message).toMatch(/too long/i)
    })

    it('accepts search text exactly 200 characters', () => {
        const result = historyQuerySchema.safeParse({ search: 'b'.repeat(200) })
        expect(result.success).toBe(true)
    })

    it('rejects limit of 0 (minimum is 1)', () => {
        const result = historyQuerySchema.safeParse({ limit: 0 })
        expect(result.success).toBe(false)
    })

    it('rejects limit of 366 (maximum is 365)', () => {
        const result = historyQuerySchema.safeParse({ limit: 366 })
        expect(result.success).toBe(false)
    })

    it('accepts limit boundary values 1 and 365', () => {
        expect(historyQuerySchema.safeParse({ limit: 1 }).success).toBe(true)
        expect(historyQuerySchema.safeParse({ limit: 365 }).success).toBe(true)
    })
})
