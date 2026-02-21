// Daily Summary Review Store — EPIC 9 (US-9.2, US-9.3, US-9.4)
// Status updates, draft edits, and draft listing for supervisor workflow.
// US-9.4: Rejection reason is mandatory and persisted in metadata JSONB.

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { DailySummary, AiInsight } from '../types/daily-summary'

interface RawDailySummaryRow {
    id: string
    summary_date: string
    total_patients: string
    avg_stage_time_minutes: string
    delay_count: string
    avg_tat_minutes: string
    total_beds_used: string
    total_stage_updates: string
    generated_at: string
    ai_summary: string | null
    metadata: Record<string, unknown>
    status?: string
    reviewed_by?: string | null
    reviewed_at?: string | null
    published_at?: string | null
    ai_insights?: unknown
}

function parseAiInsights(raw: unknown): AiInsight[] {
    if (!Array.isArray(raw)) return []
    return raw.filter((x): x is AiInsight => Boolean(x && typeof x === 'object'
        && typeof (x as AiInsight).id === 'string'
        && typeof (x as AiInsight).text === 'string'
        && typeof (x as AiInsight).confidence === 'number'))
        .map(x => ({ ...x, confidence: Math.max(0, Math.min(100, x.confidence)) }))
}

function mapRow(row: RawDailySummaryRow): DailySummary {
    const status = (row.status === 'published' || row.status === 'rejected')
        ? row.status : 'draft'
    const metadata = (row.metadata ?? {}) as DailySummary['metadata']
    return {
        id: row.id,
        summaryDate: row.summary_date,
        totalPatients: parseInt(row.total_patients, 10),
        avgStageTimeMinutes: parseFloat(row.avg_stage_time_minutes),
        delayCount: parseInt(row.delay_count, 10),
        avgTatMinutes: parseFloat(row.avg_tat_minutes),
        totalBedsUsed: parseInt(row.total_beds_used, 10),
        totalStageUpdates: parseInt(row.total_stage_updates, 10),
        generatedAt: row.generated_at,
        aiSummary: row.ai_summary ?? undefined,
        status,
        reviewedBy: row.reviewed_by ?? undefined,
        reviewedAt: row.reviewed_at ?? undefined,
        publishedAt: row.published_at ?? undefined,
        // US-9.4: surface rejectionReason from metadata for display
        rejectionReason: typeof metadata.rejectionReason === 'string'
            ? metadata.rejectionReason : undefined,
        aiInsights: parseAiInsights(row.ai_insights) ?? [],
        metadata,
    }
}

/** Update summary status to published or rejected. Only drafts can be approved/rejected.
 *  US-9.4: rejectionReason is required when status is 'rejected' and is merged into metadata.
 */
export async function updateDailySummaryStatus(
    id: string,
    status: 'published' | 'rejected',
    reviewedBy: string,
    rejectionReason?: string
): Promise<DailySummary | null> {
    const sql = `
    UPDATE daily_summaries
    SET status = $1, reviewed_by = $2, reviewed_at = NOW(),
        published_at = CASE WHEN $1 = 'published' THEN NOW() ELSE published_at END,
        metadata = CASE
            WHEN $1 = 'rejected' AND $4::text IS NOT NULL
            THEN metadata || jsonb_build_object('rejectionReason', $4::text)
            ELSE metadata
        END
    WHERE id = $3 AND status = 'draft'
    RETURNING *
  `
    const result = await query<RawDailySummaryRow>(sql, [status, reviewedBy, id, rejectionReason ?? null])
    const row = result.rows[0]
    if (!row) return null
    logger.info(`[ai-summary] Summary ${id} ${status}`)
    return mapRow(row)
}

/** Update draft text and insights (supervisor edit). */
export async function updateSummaryDraft(
    id: string,
    aiSummary: string,
    aiInsights: AiInsight[]
): Promise<DailySummary | null> {
    const sql = `
    UPDATE daily_summaries
    SET ai_summary = $1, ai_insights = $2
    WHERE id = $3 AND status = 'draft'
    RETURNING *
  `
    const result = await query<RawDailySummaryRow>(sql, [
        aiSummary,
        JSON.stringify(aiInsights),
        id,
    ])
    const row = result.rows[0]
    if (!row) return null
    logger.info(`[ai-summary] Draft ${id} updated`)
    return mapRow(row)
}

/** Toggle flagged on a specific insight. Only drafts can be flagged. */
export async function flagInsight(
    summaryId: string,
    insightId: string
): Promise<DailySummary | null> {
    const sel = await query<RawDailySummaryRow>(
        'SELECT * FROM daily_summaries WHERE id = $1 AND status = $2',
        [summaryId, 'draft']
    )
    const row = sel.rows[0]
    if (!row) return null
    const insights = parseAiInsights(row.ai_insights)
    const updated = insights.map(i =>
        i.id === insightId ? { ...i, flagged: !i.flagged } : i
    )
    const upd = await query<RawDailySummaryRow>(
        `UPDATE daily_summaries SET ai_insights = $1 WHERE id = $2 AND status = 'draft' RETURNING *`,
        [JSON.stringify(updated), summaryId]
    )
    const out = upd.rows[0]
    return out ? mapRow(out) : null
}

/** Fetch drafts pending supervisor review. */
export async function getDraftSummariesPendingReview(
    limit: number = 30
): Promise<DailySummary[]> {
    const sql = `
    SELECT * FROM daily_summaries
    WHERE status = 'draft'
    ORDER BY summary_date DESC
    LIMIT $1
  `
    const result = await query<RawDailySummaryRow>(sql, [limit])
    return result.rows.map(mapRow)
}
