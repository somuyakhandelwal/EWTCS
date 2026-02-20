// Tests for Supervisor Report Sign-Off (EPIC 12)
// Verifies signOffReport and getReportSignOff server action behaviour.

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/lib/auth', () => ({
    requireWriteRole: vi.fn(),
    requireRole: vi.fn(),
}))

vi.mock('@/shared/lib/audit', () => ({
    logAudit: vi.fn(),
}))

vi.mock('@/shared/config/logger', () => ({
    logger: { info: vi.fn(), error: vi.fn() },
}))

vi.mock('../lib/signoff-queries', () => ({
    getSignOffForReport: vi.fn(),
    createSignOff: vi.fn(),
}))

import { requireWriteRole, requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { getSignOffForReport, createSignOff } from '../lib/signoff-queries'
import { signOffReport, getReportSignOff } from '../actions/signoff-actions'
import type { ReportSignOff } from '../types/report.types'

const SUPERVISOR_SESSION = { userId: 'sup-1', username: 'supervisor1', role: 'supervisor' }
const TODAY = '2026-02-20'

const MOCK_SIGNOFF: ReportSignOff = {
    id: 'so-uuid-1',
    reportDate: TODAY,
    reportType: 'daily',
    status: 'approved',
    signedOffBy: 'sup-1',
    signedOffByUsername: 'supervisor1',
    signedOffAt: new Date('2026-02-20T10:00:00Z'),
    notes: null,
    supersededBy: null,
    createdAt: new Date('2026-02-20T10:00:00Z'),
}

describe('signOffReport', () => {
    beforeEach(() => vi.clearAllMocks())

    it('creates a sign-off for a valid date and logs the audit', async () => {
        vi.mocked(requireWriteRole).mockResolvedValue(SUPERVISOR_SESSION as never)
        vi.mocked(createSignOff).mockResolvedValue(MOCK_SIGNOFF)

        const result = await signOffReport({ reportDate: TODAY })

        expect(requireWriteRole).toHaveBeenCalledWith(
            ['supervisor', 'admin'],
            expect.objectContaining({ actionType: 'REPORT_SIGNED_OFF' })
        )
        expect(createSignOff).toHaveBeenCalledWith(
            expect.objectContaining({ reportDate: TODAY, userId: 'sup-1' })
        )
        expect(logAudit).toHaveBeenCalledWith(
            expect.objectContaining({
                actionType: 'REPORT_SIGNED_OFF',
                entityId: TODAY,
                performedBy: 'sup-1',
            })
        )
        expect(result.success).toBe(true)
        expect(result.data?.status).toBe('approved')
    })

    it('forwards optional notes to createSignOff', async () => {
        vi.mocked(requireWriteRole).mockResolvedValue(SUPERVISOR_SESSION as never)
        vi.mocked(createSignOff).mockResolvedValue({ ...MOCK_SIGNOFF, notes: 'Looks good' })

        const result = await signOffReport({ reportDate: TODAY, notes: 'Looks good' })

        expect(createSignOff).toHaveBeenCalledWith(
            expect.objectContaining({ notes: 'Looks good' })
        )
        expect(result.success).toBe(true)
    })

    it('returns error for invalid date format', async () => {
        vi.mocked(requireWriteRole).mockResolvedValue(SUPERVISOR_SESSION as never)

        const result = await signOffReport({ reportDate: 'not-a-date' })

        expect(result.success).toBe(false)
        expect(result.error).toMatch(/invalid report date/i)
        expect(createSignOff).not.toHaveBeenCalled()
    })

    it('blocks nurse role (write denied)', async () => {
        vi.mocked(requireWriteRole).mockRejectedValue(
            new Error('Read-only mode: auditors cannot perform write actions')
        )

        const result = await signOffReport({ reportDate: TODAY })

        expect(result.success).toBe(false)
        expect(result.error).toMatch(/read-only mode/i)
        expect(createSignOff).not.toHaveBeenCalled()
    })

    it('blocks auditor role (write denied)', async () => {
        vi.mocked(requireWriteRole).mockRejectedValue(
            new Error('Read-only mode: auditors cannot perform write actions')
        )

        const result = await signOffReport({ reportDate: TODAY })

        expect(result.success).toBe(false)
        expect(logAudit).not.toHaveBeenCalled()
    })

    it('returns error when DB query throws', async () => {
        vi.mocked(requireWriteRole).mockResolvedValue(SUPERVISOR_SESSION as never)
        vi.mocked(createSignOff).mockRejectedValue(new Error('DB connection lost'))

        const result = await signOffReport({ reportDate: TODAY })

        expect(result.success).toBe(false)
        expect(result.error).toBe('DB connection lost')
    })
})

describe('getReportSignOff', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns the current approved sign-off', async () => {
        vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION as never)
        vi.mocked(getSignOffForReport).mockResolvedValue(MOCK_SIGNOFF)

        const result = await getReportSignOff({ reportDate: TODAY })

        expect(result.success).toBe(true)
        expect(result.data?.id).toBe('so-uuid-1')
    })

    it('returns data: null when no sign-off exists', async () => {
        vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION as never)
        vi.mocked(getSignOffForReport).mockResolvedValue(null)

        const result = await getReportSignOff({ reportDate: TODAY })

        expect(result.success).toBe(true)
        expect(result.data).toBeNull()
    })

    it('blocks unauthorized roles', async () => {
        vi.mocked(requireRole).mockRejectedValue(
            new Error('Unauthorized: Required role(s): supervisor, admin, auditor')
        )

        const result = await getReportSignOff({ reportDate: TODAY })

        expect(result.success).toBe(false)
        expect(result.error).toMatch(/unauthorized/i)
    })
})
