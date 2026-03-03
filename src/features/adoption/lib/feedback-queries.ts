import { query } from '@/shared/lib/db'
import type { UserFeedback } from '@/features/adoption/types'
import type { FeedbackInput } from '@/features/adoption/schemas/feedback-schema'

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export async function insertFeedback(
    userId: string,
    input: FeedbackInput
): Promise<string> {
    const result = await query<{ id: string }>(`
        INSERT INTO user_feedback (user_id, category, rating, message)
        VALUES ($1, $2, $3, $4)
        RETURNING id
    `, [userId, input.category, input.rating ?? null, input.message ?? null])

    return result.rows[0].id
}

// ---------------------------------------------------------------------------
// Read (admin only)
// ---------------------------------------------------------------------------

interface FeedbackRow {
    id: string
    user_id: string
    username: string
    category: string
    rating: number | null
    message: string | null
    created_at: string
}

export async function fetchAllFeedback(limit = 50, offset = 0): Promise<UserFeedback[]> {
    const result = await query<FeedbackRow>(`
        SELECT
            uf.id,
            uf.user_id,
            u.username,
            uf.category,
            uf.rating,
            uf.message,
            uf.created_at
        FROM user_feedback uf
        JOIN users u ON u.id = uf.user_id
        ORDER BY uf.created_at DESC
        LIMIT $1 OFFSET $2
    `, [limit, offset])

    return result.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        username: row.username,
        category: row.category as UserFeedback['category'],
        rating: row.rating,
        message: row.message,
        createdAt: row.created_at,
    }))
}

export async function fetchFeedbackStats(): Promise<{
    total: number
    avgRating: number | null
    byCategory: Record<string, number>
}> {
    // Overall totals in a single pass
    const overallResult = await query<{ total: string; avg_rating: string | null }>(`
        SELECT
            COUNT(*)                          AS total,
            ROUND(AVG(rating)::NUMERIC, 1)   AS avg_rating
        FROM user_feedback
    `)

    const overall = overallResult.rows[0]
    const total = parseInt(overall.total, 10)

    if (total === 0) {
        return { total: 0, avgRating: null, byCategory: {} }
    }

    // Per-category breakdown
    const catResult = await query<{ category: string; cat_count: string }>(`
        SELECT category, COUNT(*) AS cat_count
        FROM user_feedback
        GROUP BY category
        ORDER BY cat_count DESC
    `)

    const byCategory: Record<string, number> = {}
    for (const row of catResult.rows) {
        byCategory[row.category] = parseInt(row.cat_count, 10)
    }

    return {
        total,
        avgRating: overall.avg_rating != null ? parseFloat(overall.avg_rating) : null,
        byCategory,
    }
}
