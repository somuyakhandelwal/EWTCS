'use server'

import { logger } from '@/shared/config/logger'
import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { feedbackInputSchema } from '@/features/adoption/schemas/feedback-schema'
import { insertFeedback, fetchAllFeedback, fetchFeedbackStats } from '@/features/adoption/lib/feedback-queries'
import type { UserFeedback } from '@/features/adoption/types'

// ---------------------------------------------------------------------------
// submitFeedback — any authenticated user
// ---------------------------------------------------------------------------

export async function submitFeedback(input: {
    category: string
    rating?: number | null
    message?: string | null
}): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const session = await requireRole(['nurse', 'housekeeping', 'supervisor', 'admin', 'auditor'])

        const parsed = feedbackInputSchema.safeParse(input)
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' }
        }

        const id = await insertFeedback(session.userId, parsed.data)

        await logAudit({
            actionType: 'FEEDBACK_SUBMITTED',
            entityType: 'user_feedback',
            entityId: id,
            performedBy: session.userId,
            metadata: { category: parsed.data.category, rating: parsed.data.rating },
        })

        return { success: true, id }
    } catch (error) {
        logger.error('submitFeedback failed', error as Error)
        return { success: false, error: 'Failed to submit feedback' }
    }
}

// ---------------------------------------------------------------------------
// getFeedbackList — admin only
// ---------------------------------------------------------------------------

export async function getFeedbackList(limit = 50, offset = 0): Promise<{
    success: boolean
    data?: UserFeedback[]
    error?: string
}> {
    try {
        await requireRole('admin')
        const data = await fetchAllFeedback(limit, offset)
        return { success: true, data }
    } catch (error) {
        logger.error('getFeedbackList failed', error as Error)
        return { success: false, error: 'Failed to load feedback' }
    }
}

// ---------------------------------------------------------------------------
// getFeedbackStats — admin only
// ---------------------------------------------------------------------------

export async function getFeedbackStats(): Promise<{
    success: boolean
    data?: { total: number; avgRating: number | null; byCategory: Record<string, number> }
    error?: string
}> {
    try {
        await requireRole('admin')
        const data = await fetchFeedbackStats()
        return { success: true, data }
    } catch (error) {
        logger.error('getFeedbackStats failed', error as Error)
        return { success: false, error: 'Failed to load feedback stats' }
    }
}
