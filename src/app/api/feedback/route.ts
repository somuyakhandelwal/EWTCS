import { NextResponse } from 'next/server'
import { verifyActiveSession } from '@/shared/lib/active-session'
import { feedbackInputSchema } from '@/features/adoption/schemas/feedback-schema'
import { insertFeedback } from '@/features/adoption/lib/feedback-queries'
import { logAudit } from '@/shared/lib/audit'
import { logger } from '@/shared/config/logger'

export const dynamic = 'force-dynamic'

/**
 * POST /api/feedback
 * Submit user feedback. Available to all authenticated roles.
 * Body: { category, rating?, message? }
 */
export async function POST(request: Request) {
    try {
        const session = await verifyActiveSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const parsed = feedbackInputSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? 'Validation error' },
                { status: 400 }
            )
        }

        const id = await insertFeedback(session.userId, parsed.data)

        await logAudit({
            actionType: 'FEEDBACK_SUBMITTED',
            entityType: 'user_feedback',
            entityId: id,
            performedBy: session.userId,
            metadata: { category: parsed.data.category, rating: parsed.data.rating },
        })

        return NextResponse.json({ success: true, id }, { status: 201 })
    } catch (error) {
        logger.error('POST /api/feedback failed', error as Error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
