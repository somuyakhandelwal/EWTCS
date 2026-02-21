import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requireRole } from '@/shared/lib/auth'
import {
    updateDailySummaryStatus,
} from '@/features/ai-summary/lib/daily-summary-review-store'
import {
    approveSummary,
} from '@/features/ai-summary/actions/daily-summary-review-actions'
import type { DailySummary } from '@/features/ai-summary/types/daily-summary'

vi.mock('@/shared/lib/auth', () => ({ requireRole: vi.fn() }))
vi.mock('@/shared/lib/audit', () => ({ logAudit: vi.fn() }))
vi.mock('@/shared/config/logger', () => ({
    logger: { info: vi.fn(), error: vi.fn() },
}))
vi.mock('@/features/ai-summary/lib/daily-summary-store', () => ({
    getDailySummaryById: vi.fn(),
}))
vi.mock('@/features/ai-summary/lib/daily-summary-review-store', () => ({
    updateDailySummaryStatus: vi.fn(),
    updateSummaryDraft: vi.fn(),
    flagInsight: vi.fn(),
    getDraftSummariesPendingReview: vi.fn(),
}))

const SUPERVISOR_SESSION = { userId: 'sup-1', role: 'supervisor' }
const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'

const DRAFT_SUMMARY: DailySummary = {
    id: VALID_UUID,
    summaryDate: '2026-02-20',
    totalPatients: 10,
    avgStageTimeMinutes: 5,
    delayCount: 2,
    avgTatMinutes: 25,
    totalBedsUsed: 12,
    totalStageUpdates: 40,
    generatedAt: '2026-02-21T00:00:00.000Z',
    aiSummary: 'Summary text',
    status: 'draft',
    aiInsights: [],
    metadata: {},
}

describe('approveSummary', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns success when draft approved', async () => {
        vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION as never)
        vi.mocked(updateDailySummaryStatus).mockResolvedValue({
            ...DRAFT_SUMMARY,
            status: 'published',
        })
        const result = await approveSummary({ id: VALID_UUID })
        expect(result.success).toBe(true)
        expect(result.summary?.status).toBe('published')
        expect(vi.mocked(requireRole)).toHaveBeenCalledWith(['admin', 'supervisor'])
    })

    it('returns success when admin approves', async () => {
        const ADMIN_SESSION = { userId: 'admin-1', role: 'admin' }
        vi.mocked(requireRole).mockResolvedValue(ADMIN_SESSION as never)
        vi.mocked(updateDailySummaryStatus).mockResolvedValue({
            ...DRAFT_SUMMARY,
            status: 'published',
        })
        const result = await approveSummary({ id: VALID_UUID })
        expect(result.success).toBe(true)
        expect(vi.mocked(requireRole)).toHaveBeenCalledWith(['admin', 'supervisor'])
    })

    it('returns error when not draft (SQL returns null)', async () => {
        vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION as never)
        vi.mocked(updateDailySummaryStatus).mockResolvedValue(null)
        const result = await approveSummary({ id: VALID_UUID })
        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
    })

    it('returns error on invalid id', async () => {
        vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION as never)
        const result = await approveSummary({ id: 'not-a-uuid' })
        expect(result.success).toBe(false)
    })
})
