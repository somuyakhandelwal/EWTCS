import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { searchArchivedAdmissions } from '../lib/archive-search-queries'
import { searchArchive } from '../actions/archive-search-actions'
import type { ArchivedAdmission } from '../lib/data-retention-types'

vi.mock('@/shared/lib/auth', () => ({ requireRole: vi.fn() }))
vi.mock('@/shared/lib/audit', () => ({ logAudit: vi.fn() }))
vi.mock('../lib/archive-search-queries', () => ({
    searchArchivedAdmissions: vi.fn(),
    searchArchivedAuditLogs: vi.fn(),
}))

const SESSION = { userId: 'auditor-1', role: 'auditor' }

const SAMPLE_ADMISSION: ArchivedAdmission = {
    id: 'adm-1',
    bedId: 'bed-A1',
    admittedAt: new Date('2024-01-15T08:00:00Z'),
    dischargedAt: new Date('2024-01-16T08:00:00Z'),
    totalDurationMs: 86_400_000,
    dischargedByUserId: 'nurse-1',
    notes: null,
    createdAt: new Date('2024-01-15T08:00:00Z'),
    tatFromPreviousDischargeMs: null,
    archivedAt: new Date('2025-02-01T00:00:00Z'),
}

describe('searchArchive — additional edge cases', () => {
    beforeEach(() => vi.clearAllMocks())

    it('passes custom limit through to the query function', async () => {
        vi.mocked(requireRole).mockResolvedValue(SESSION as never)
        vi.mocked(searchArchivedAdmissions).mockResolvedValue([SAMPLE_ADMISSION])

        await searchArchive({ table: 'patient_admissions', from: '2024-01-01', to: '2024-12-31', limit: 50 } as any)

        expect(searchArchivedAdmissions).toHaveBeenCalledWith(
            expect.objectContaining({ limit: 50 }),
        )
    })

    it('rejects invalid from date that passes regex but fails Date.parse', async () => {
        vi.mocked(requireRole).mockResolvedValue(SESSION as never)

        const result = await searchArchive({ table: 'patient_admissions', from: '2024-13-01', to: '2024-12-31' } as any)
        expect(result.success).toBe(false)
    })

    it('rejects missing table field', async () => {
        vi.mocked(requireRole).mockResolvedValue(SESSION as never)
        const result = await searchArchive({ from: '2024-01-01', to: '2024-12-31' } as any)
        expect(result.success).toBe(false)
    })

    it('rejects missing from field', async () => {
        vi.mocked(requireRole).mockResolvedValue(SESSION as never)
        const result = await searchArchive({ table: 'patient_admissions', to: '2024-12-31' } as any)
        expect(result.success).toBe(false)
    })

    it('rejects missing to field', async () => {
        vi.mocked(requireRole).mockResolvedValue(SESSION as never)
        const result = await searchArchive({ table: 'patient_admissions', from: '2024-01-01' } as any)
        expect(result.success).toBe(false)
    })

    it('accepts from === to (single day is valid)', async () => {
        vi.mocked(requireRole).mockResolvedValue(SESSION as never)
        vi.mocked(searchArchivedAdmissions).mockResolvedValue([])

        const result = await searchArchive({ table: 'patient_admissions', from: '2024-06-15', to: '2024-06-15' } as any)
        expect(result.success).toBe(true)
    })

    it('includes rowCount in the returned metadata', async () => {
        vi.mocked(requireRole).mockResolvedValue(SESSION as never)
        vi.mocked(searchArchivedAdmissions).mockResolvedValue([SAMPLE_ADMISSION, SAMPLE_ADMISSION])

        const result = await searchArchive({ table: 'patient_admissions', from: '2024-01-01', to: '2024-12-31' } as any)
        expect(result.rowCount).toBe(2)
    })

    it('audit log includes the date range as entityId', async () => {
        vi.mocked(requireRole).mockResolvedValue(SESSION as never)
        vi.mocked(searchArchivedAdmissions).mockResolvedValue([])

        await searchArchive({ table: 'patient_admissions', from: '2024-03-01', to: '2024-03-31' } as any)

        expect(logAudit).toHaveBeenCalledWith(
            expect.objectContaining({
                entityId: '2024-03-01__2024-03-31',
            }),
        )
    })

    it('rejects limit of 0 or above 1000', async () => {
        vi.mocked(requireRole).mockResolvedValue(SESSION as never)

        let result = await searchArchive({ table: 'patient_admissions', from: '2024-01-01', to: '2024-12-31', limit: 0 } as any)
        expect(result.success).toBe(false)

        result = await searchArchive({ table: 'patient_admissions', from: '2024-01-01', to: '2024-12-31', limit: 1001 } as any)
        expect(result.success).toBe(false)
    })
})
