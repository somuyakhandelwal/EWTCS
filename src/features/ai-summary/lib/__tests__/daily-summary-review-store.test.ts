// Tests — EPIC 9: daily-summary-review-store.ts (US-9.2, US-9.3, US-9.4)

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/lib/db', () => ({ query: vi.fn() }))
vi.mock('@/shared/config/logger', () => ({
    logger: { info: vi.fn(), error: vi.fn() },
}))

import { query } from '@/shared/lib/db'
import {
    updateDailySummaryStatus,
    updateSummaryDraft,
    flagInsight,
    getDraftSummariesPendingReview,
} from '../daily-summary-review-store'

const RAW_ROW = {
    id: 'uuid-123',
    summary_date: '2026-02-20',
    total_patients: '15',
    avg_stage_time_minutes: '5.25',
    delay_count: '3',
    avg_tat_minutes: '28.5',
    total_beds_used: '18',
    total_stage_updates: '72',
    generated_at: '2026-02-21T00:00:00.000Z',
    ai_summary: 'Sample text',
    metadata: {},
    status: 'draft',
    ai_insights: [],
}

describe('updateDailySummaryStatus', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns summary when draft is approved', async () => {
        vi.mocked(query).mockResolvedValueOnce({
            rows: [{ ...RAW_ROW, status: 'published' }],
        } as never)
        const result = await updateDailySummaryStatus('uuid-123', 'published', 'user-1')
        expect(result).not.toBeNull()
        expect(result?.status).toBe('published')
    })

    it('returns null when row is not draft (WHERE status=draft)', async () => {
        vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never)
        const result = await updateDailySummaryStatus('uuid-123', 'published', 'user-1')
        expect(result).toBeNull()
    })

    // US-9.4: rejectionReason must be forwarded to the SQL layer as 4th parameter
    it('passes rejectionReason to query params when rejecting', async () => {
        vi.mocked(query).mockResolvedValueOnce({
            rows: [{ ...RAW_ROW, status: 'rejected' }],
        } as never)
        await updateDailySummaryStatus('uuid-123', 'rejected', 'user-1', 'Incomplete data provided')
        const callArgs = vi.mocked(query).mock.calls[0]
        // 4th element of params array should be the rejection reason
        expect(callArgs[1]).toEqual(['rejected', 'user-1', 'uuid-123', 'Incomplete data provided'])
    })
})

describe('updateSummaryDraft', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns updated summary when draft exists', async () => {
        vi.mocked(query).mockResolvedValueOnce({
            rows: [{ ...RAW_ROW, ai_summary: 'Updated text' }],
        } as never)
        const result = await updateSummaryDraft(
            'uuid-123',
            'Updated text',
            [{ id: 'i1', text: 'Insight', confidence: 80 }]
        )
        expect(result).not.toBeNull()
    })

    it('returns null when not draft', async () => {
        vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never)
        const result = await updateSummaryDraft('uuid-123', 'Text', [])
        expect(result).toBeNull()
    })
})

describe('flagInsight', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns null when summary is not draft', async () => {
        vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never)
        const result = await flagInsight('uuid-123', 'insight-1')
        expect(result).toBeNull()
    })

    it('returns updated summary when draft and insight found', async () => {
        const rowWithInsights = {
            ...RAW_ROW,
            ai_insights: [{ id: 'insight-1', text: 'X', confidence: 70 }],
        }
        vi.mocked(query)
            .mockResolvedValueOnce({ rows: [rowWithInsights] } as never)
            .mockResolvedValueOnce({
                rows: [{ ...rowWithInsights, ai_insights: [{ id: 'insight-1', text: 'X', confidence: 70, flagged: true }] }],
            } as never)
        const result = await flagInsight('uuid-123', 'insight-1')
        expect(result).not.toBeNull()
    })
})

describe('getDraftSummariesPendingReview', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns drafts only', async () => {
        vi.mocked(query).mockResolvedValueOnce({
            rows: [RAW_ROW, { ...RAW_ROW, id: 'uuid-456' }],
        } as never)
        const result = await getDraftSummariesPendingReview(10)
        expect(result).toHaveLength(2)
    })
})
