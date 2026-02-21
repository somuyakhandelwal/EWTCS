// Tests — EPIC 9: daily-summary-review-actions.ts (US-9.2, US-9.3, US-9.4)

import { describe, it, expect, vi, beforeEach } from 'vitest'

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

import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { getDailySummaryById } from '@/features/ai-summary/lib/daily-summary-store'
import {
    updateDailySummaryStatus,
    updateSummaryDraft,
    flagInsight,
    getDraftSummariesPendingReview,
} from '@/features/ai-summary/lib/daily-summary-review-store'
import {
    approveSummary,
    rejectSummary,
    updateSummaryDraftAction,
    flagInsightAction,
    fetchDraftSummariesPendingReview,
    fetchDailySummaryById,
} from '@/features/ai-summary/actions/daily-summary-review-actions'
import type { DailySummary } from '@/features/ai-summary/types/daily-summary'

const SUPERVISOR_SESSION = { userId: 'sup-1', role: 'supervisor' }
const AUDITOR_SESSION = { userId: 'aud-1', role: 'auditor' }

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
        expect(vi.mocked(requireRole)).toHaveBeenCalledWith(['supervisor'])
    })

    it('returns error when admin attempts approval', async () => {
        vi.mocked(requireRole).mockRejectedValue(new Error('Unauthorized: Required role(s): supervisor'))
        const result = await approveSummary({ id: VALID_UUID })
        expect(result.success).toBe(false)
        expect(updateDailySummaryStatus).not.toHaveBeenCalled()
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

describe('rejectSummary', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns success when draft rejected with valid reason', async () => {
        vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION as never)
        vi.mocked(updateDailySummaryStatus).mockResolvedValue({
            ...DRAFT_SUMMARY,
            status: 'rejected',
        })
        const result = await rejectSummary({ id: VALID_UUID, reason: 'Missing critical data points' })
        expect(result.success).toBe(true)
        expect(vi.mocked(requireRole)).toHaveBeenCalledWith(['supervisor'])
    })

    // US-9.4: reason is required — missing reason must fail Zod validation
    it('returns validation error when reason is missing', async () => {
        vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION as never)
        // Cast to bypass TS since we are testing the runtime validation path
        const result = await rejectSummary({ id: VALID_UUID, reason: '' } as never)
        expect(result.success).toBe(false)
        expect(result.error).toMatch(/reason/i)
    })

    // US-9.4: reason shorter than 10 characters must be rejected
    it('returns validation error when reason is fewer than 10 characters', async () => {
        vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION as never)
        const result = await rejectSummary({ id: VALID_UUID, reason: 'Too short' })
        expect(result.success).toBe(false)
        expect(result.error).toMatch(/reason/i)
    })

    // US-9.4: audit log must record supervisor ID and the rejection reason
    it('logs supervisor ID and reason in audit on successful rejection', async () => {
        vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION as never)
        vi.mocked(updateDailySummaryStatus).mockResolvedValue({
            ...DRAFT_SUMMARY,
            status: 'rejected',
        })
        await rejectSummary({ id: VALID_UUID, reason: 'Data completeness issues noted by supervisor' })
        expect(vi.mocked(logAudit)).toHaveBeenCalledWith(
            expect.objectContaining({
                performedBy: SUPERVISOR_SESSION.userId,
                metadata: expect.objectContaining({
                    reason: 'Data completeness issues noted by supervisor',
                }),
            })
        )
    })
})

describe('updateSummaryDraftAction', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns error when summary is not draft', async () => {
        vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION as never)
        vi.mocked(getDailySummaryById).mockResolvedValue({
            ...DRAFT_SUMMARY,
            id: VALID_UUID,
            status: 'published',
        })
        const result = await updateSummaryDraftAction({
            id: VALID_UUID,
            aiSummary: 'New text',
            aiInsights: [],
        })
        expect(result.success).toBe(false)
        expect(result.error).toMatch(/draft/i)
    })

    it('returns success when draft updated', async () => {
        vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION as never)
        vi.mocked(getDailySummaryById).mockResolvedValue({ ...DRAFT_SUMMARY, id: VALID_UUID })
        vi.mocked(updateSummaryDraft).mockResolvedValue({ ...DRAFT_SUMMARY, id: VALID_UUID })
        const result = await updateSummaryDraftAction({
            id: VALID_UUID,
            aiSummary: 'Updated text that meets minimum length',
            aiInsights: [],
        })
        expect(result.success).toBe(true)
    })
})

describe('flagInsightAction', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns success when insight flagged', async () => {
        vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION as never)
        vi.mocked(flagInsight).mockResolvedValue({
            ...DRAFT_SUMMARY,
            aiInsights: [{ id: 'i1', text: 'X', confidence: 80, flagged: true }],
        })
        const result = await flagInsightAction({
            summaryId: VALID_UUID,
            insightId: 'i1',
        })
        expect(result.success).toBe(true)
    })
})

describe('fetchDraftSummariesPendingReview', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns drafts for authorized user', async () => {
        vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION as never)
        vi.mocked(getDraftSummariesPendingReview).mockResolvedValue([DRAFT_SUMMARY])
        const result = await fetchDraftSummariesPendingReview(10)
        expect(result.success).toBe(true)
        expect(result.summaries).toHaveLength(1)
        expect(vi.mocked(requireRole)).toHaveBeenCalledWith(['supervisor'])
    })
})

describe('fetchDailySummaryById', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns null for auditor when summary is draft', async () => {
        vi.mocked(requireRole).mockResolvedValue(AUDITOR_SESSION as never)
        vi.mocked(getDailySummaryById).mockResolvedValue(DRAFT_SUMMARY)
        const result = await fetchDailySummaryById(VALID_UUID)
        expect(result.success).toBe(true)
        expect(result.summary).toBeNull()
    })
})
