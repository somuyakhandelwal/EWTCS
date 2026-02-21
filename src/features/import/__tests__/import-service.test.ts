import { describe, it, expect, vi, beforeEach } from 'vitest'
import { processHistoricalImport } from '../lib/import-service'
import { query } from '@/shared/lib/db'

// Mock the db module
vi.mock('@/shared/lib/db', () => ({
    query: vi.fn(),
}))

describe('Import Service Integration (with Deduplication)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should process valid admissions successfully', async () => {
        // 1. Mock DB pre-fetches
        const mockBeds = { rows: [{ id: 'bed-1', bed_number: 'ER-01' }] }
        const mockUsers = { rows: [{ id: 'user-1', username: 'admin' }] }

        vi.mocked(query)
            .mockResolvedValueOnce(mockBeds as any)  // Fetch beds
            .mockResolvedValueOnce(mockUsers as any) // Fetch users
            .mockResolvedValueOnce({ rowCount: 0 } as any) // Deduplication check: 0 rows found
            .mockResolvedValueOnce({ rowCount: 1 } as any) // Insertion: success

        const admissions = [{
            bed_number: 'ER-01',
            admitted_at: '2024-01-01T10:00:00Z',
            discharged_at: '2024-01-01T12:00:00Z',
            discharged_by_username: 'admin',
            notes: 'Test'
        }]

        const result = await processHistoricalImport(admissions)

        expect(result.successCount).toBe(1)
        expect(result.failureCount).toBe(0)
        expect(query).toHaveBeenCalledTimes(4) // 2 pre-fetches + 1 check + 1 insert
    })

    it('should skip duplicate entries', async () => {
        vi.mocked(query)
            .mockResolvedValueOnce({ rows: [{ id: 'bed-1', bed_number: 'ER-01' }] } as any)
            .mockResolvedValueOnce({ rows: [{ id: 'user-1', username: 'admin' }] } as any)
            .mockResolvedValueOnce({ rowCount: 1 } as any) // Deduplication check: 1 row FOUND

        const admissions = [{
            bed_number: 'ER-01',
            admitted_at: '2024-01-01T10:00:00Z',
            discharged_at: '2024-01-01T12:00:00Z',
            discharged_by_username: 'admin',
        }]

        const result = await processHistoricalImport(admissions)
        expect(result.successCount).toBe(0)
        expect(result.failureCount).toBe(1)
        expect(result.errors[0].error).toContain('Duplicate entry')
    })

    it('should handle non-existent bed numbers', async () => {
        vi.mocked(query)
            .mockResolvedValueOnce({ rows: [] } as any)
            .mockResolvedValueOnce({ rows: [{ id: 'user-1', username: 'admin' }] } as any)

        const admissions = [{
            bed_number: 'MISSING',
            admitted_at: '2024-01-01T10:00:00Z',
            discharged_at: '2024-01-01T12:00:00Z',
            discharged_by_username: 'admin',
        }]

        const result = await processHistoricalImport(admissions)
        expect(result.failureCount).toBe(1)
        expect(result.errors[0].error).toContain('Bed number "MISSING" not found')
    })

    it('should handle database errors during check', async () => {
        vi.mocked(query)
            .mockResolvedValueOnce({ rows: [{ id: 'bed-1', bed_number: 'ER-01' }] } as any)
            .mockResolvedValueOnce({ rows: [{ id: 'user-1', username: 'admin' }] } as any)
            .mockRejectedValueOnce(new Error('DB Connection Timeout'))

        const admissions = [{
            bed_number: 'ER-01',
            admitted_at: '2024-01-01T10:00:00Z',
            discharged_at: '2024-01-01T12:00:00Z',
            discharged_by_username: 'admin',
        }]

        const result = await processHistoricalImport(admissions)
        expect(result.failureCount).toBe(1)
        expect(result.errors[0].error).toBe('DB Connection Timeout')
    })
})
