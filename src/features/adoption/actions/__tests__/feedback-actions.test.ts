import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/lib/auth', () => ({ requireRole: vi.fn() }))
vi.mock('@/shared/lib/audit', () => ({ logAudit: vi.fn() }))
vi.mock('@/shared/config/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@/features/adoption/lib/feedback-queries', () => ({
    insertFeedback: vi.fn(),
    fetchAllFeedback: vi.fn(),
    fetchFeedbackStats: vi.fn(),
}))

import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import {
    insertFeedback,
    fetchAllFeedback,
    fetchFeedbackStats,
} from '@/features/adoption/lib/feedback-queries'
import {
    submitFeedback,
    getFeedbackList,
    getFeedbackStats,
} from '@/features/adoption/actions/feedback-actions'
import type { UserFeedback } from '@/features/adoption/types'

const NURSE_SESSION   = { userId: 'nurse-uuid-1',   role: 'nurse'   }
const ADMIN_SESSION   = { userId: 'admin-uuid-1',   role: 'admin'   }

const MOCK_FEEDBACK: UserFeedback[] = [
    {
        id: 'fb-1',
        userId: 'nurse-uuid-1',
        username: 'nurse1',
        category: 'usability',
        rating: 4,
        message: 'Very easy to use',
        createdAt: '2026-03-01T10:00:00Z',
    },
]

const MOCK_STATS = {
    total: 1,
    avgRating: 4.0,
    byCategory: { usability: 1 },
}

describe('feedback-actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // -----------------------------------------------------------------------
    // submitFeedback
    // -----------------------------------------------------------------------
    describe('submitFeedback', () => {
        it('successfully submits feedback with rating and message', async () => {
            vi.mocked(requireRole).mockResolvedValue(NURSE_SESSION as never)
            vi.mocked(insertFeedback).mockResolvedValue('fb-uuid-new')
            vi.mocked(logAudit).mockResolvedValue(undefined)

            const result = await submitFeedback({ category: 'general', rating: 5, message: 'Great system' })

            expect(result.success).toBe(true)
            expect(result.id).toBe('fb-uuid-new')
            expect(insertFeedback).toHaveBeenCalledWith('nurse-uuid-1', expect.objectContaining({ category: 'general', rating: 5 }))
            expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ actionType: 'FEEDBACK_SUBMITTED' }))
        })

        it('submits feedback with rating only (no message)', async () => {
            vi.mocked(requireRole).mockResolvedValue(NURSE_SESSION as never)
            vi.mocked(insertFeedback).mockResolvedValue('fb-uuid-2')
            vi.mocked(logAudit).mockResolvedValue(undefined)

            const result = await submitFeedback({ category: 'usability', rating: 3 })

            expect(result.success).toBe(true)
        })

        it('submits feedback with message only (no rating)', async () => {
            vi.mocked(requireRole).mockResolvedValue(NURSE_SESSION as never)
            vi.mocked(insertFeedback).mockResolvedValue('fb-uuid-3')
            vi.mocked(logAudit).mockResolvedValue(undefined)

            const result = await submitFeedback({ category: 'bug', message: 'Stage buttons sometimes unresponsive' })

            expect(result.success).toBe(true)
        })

        it('rejects when neither rating nor message is provided', async () => {
            vi.mocked(requireRole).mockResolvedValue(NURSE_SESSION as never)

            const result = await submitFeedback({ category: 'general' })

            expect(result.success).toBe(false)
            expect(result.error).toBe('Please provide a rating or a message')
            expect(insertFeedback).not.toHaveBeenCalled()
        })

        it('rejects invalid category', async () => {
            vi.mocked(requireRole).mockResolvedValue(NURSE_SESSION as never)

            const result = await submitFeedback({ category: 'invalid', rating: 3 })

            expect(result.success).toBe(false)
            expect(insertFeedback).not.toHaveBeenCalled()
        })

        it('rejects rating out of range (0)', async () => {
            vi.mocked(requireRole).mockResolvedValue(NURSE_SESSION as never)

            const result = await submitFeedback({ category: 'general', rating: 0 })

            expect(result.success).toBe(false)
            expect(insertFeedback).not.toHaveBeenCalled()
        })

        it('rejects rating out of range (6)', async () => {
            vi.mocked(requireRole).mockResolvedValue(NURSE_SESSION as never)

            const result = await submitFeedback({ category: 'general', rating: 6 })

            expect(result.success).toBe(false)
            expect(insertFeedback).not.toHaveBeenCalled()
        })

        it('returns error when auth fails', async () => {
            vi.mocked(requireRole).mockRejectedValue(new Error('Unauthorized'))

            const result = await submitFeedback({ category: 'general', message: 'test' })

            expect(result.success).toBe(false)
            expect(result.error).toBe('Failed to submit feedback')
        })

        it('rejects message exceeding 2000 characters', async () => {
            vi.mocked(requireRole).mockResolvedValue(NURSE_SESSION as never)

            const result = await submitFeedback({ category: 'general', message: 'a'.repeat(2001) })

            expect(result.success).toBe(false)
            expect(insertFeedback).not.toHaveBeenCalled()
        })
    })

    // -----------------------------------------------------------------------
    // getFeedbackList
    // -----------------------------------------------------------------------
    describe('getFeedbackList', () => {
        it('returns feedback items for admin', async () => {
            vi.mocked(requireRole).mockResolvedValue(ADMIN_SESSION as never)
            vi.mocked(fetchAllFeedback).mockResolvedValue(MOCK_FEEDBACK)

            const result = await getFeedbackList()

            expect(result.success).toBe(true)
            expect(result.data).toHaveLength(1)
        })

        it('blocks non-admin user', async () => {
            vi.mocked(requireRole).mockRejectedValue(new Error('Unauthorized'))

            const result = await getFeedbackList()

            expect(result.success).toBe(false)
            expect(fetchAllFeedback).not.toHaveBeenCalled()
        })
    })

    // -----------------------------------------------------------------------
    // getFeedbackStats
    // -----------------------------------------------------------------------
    describe('getFeedbackStats', () => {
        it('returns stats for admin', async () => {
            vi.mocked(requireRole).mockResolvedValue(ADMIN_SESSION as never)
            vi.mocked(fetchFeedbackStats).mockResolvedValue(MOCK_STATS)

            const result = await getFeedbackStats()

            expect(result.success).toBe(true)
            expect(result.data?.total).toBe(1)
            expect(result.data?.avgRating).toBe(4.0)
        })

        it('returns error when DB fails', async () => {
            vi.mocked(requireRole).mockResolvedValue(ADMIN_SESSION as never)
            vi.mocked(fetchFeedbackStats).mockRejectedValue(new Error('DB error'))

            const result = await getFeedbackStats()

            expect(result.success).toBe(false)
            expect(result.error).toBe('Failed to load feedback stats')
        })
    })
})
