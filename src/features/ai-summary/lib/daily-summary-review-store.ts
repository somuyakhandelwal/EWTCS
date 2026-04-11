// Daily Summary Review Store — EPIC 9 (US-9.2, US-9.3)
// Status updates, draft edits, and draft listing for supervisor workflow.

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

const SUMMARY_SELECT = `
    SELECT
        r.id,
        r.summary_date,
        COALESCE(mv.total_patients, 0) AS total_patients,
        COALESCE(mv.avg_stage_time_minutes, 0) AS avg_stage_time_minutes,
        COALESCE(mv.delay_count, 0) AS delay_count,
        COALESCE(mv.avg_tat_minutes, 0) AS avg_tat_minutes,
        COALESCE(mv.total_beds_used, 0) AS total_beds_used,
        COALESCE(mv.total_stage_updates, 0) AS total_stage_updates,
        COALESCE(mv.generated_at, r.updated_at) AS generated_at,
        r.ai_summary,
        r.metadata,
        r.status,
        r.reviewed_by,
        r.reviewed_at,
        r.published_at,
        r.ai_insights
    FROM daily_summary_reviews r
    LEFT JOIN daily_summaries_mv mv ON mv.summary_date = r.summary_date
`

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
        aiInsights: parseAiInsights(row.ai_insights) ?? [],
        metadata: (row.metadata ?? {}) as DailySummary['metadata'],
    }
}

/** Update summary status to published or rejected. Only drafts can be approved/rejected. */
export async function updateDailySummaryStatus(
    id: string,
    status: 'published' | 'rejected',
    reviewedBy: string
): Promise<DailySummary | null> {
    const sql = `
    WITH updated AS (
      UPDATE daily_summary_reviews
      SET status = $1,
          reviewed_by = $2,
          reviewed_at = NOW(),
          published_at = CASE WHEN $1 = 'published' THEN NOW() ELSE published_at END,
          updated_at = NOW()
      WHERE id = $3 AND status = 'draft'
      RETURNING id
    )
    ${SUMMARY_SELECT}
    WHERE r.id IN (SELECT id FROM updated)
    LIMIT 1
  `
    const result = await query<RawDailySummaryRow>(sql, [status, reviewedBy, id])
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
    WITH updated AS (
      UPDATE daily_summary_reviews
      SET ai_summary = $1,
          ai_insights = $2,
          updated_at = NOW()
      WHERE id = $3 AND status = 'draft'
      RETURNING id
    )
    ${SUMMARY_SELECT}
    WHERE r.id IN (SELECT id FROM updated)
    LIMIT 1
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
    const sel = await query<{ ai_insights: unknown }>(
        'SELECT ai_insights FROM daily_summary_reviews WHERE id = $1 AND status = $2',
        [summaryId, 'draft']
    )
    const row = sel.rows[0]
    if (!row) return null
    const insights = parseAiInsights(row.ai_insights)
    const updated = insights.map(i =>
        i.id === insightId ? { ...i, flagged: !i.flagged } : i
    )
    const upd = await query<RawDailySummaryRow>(
        `WITH changed AS (
           UPDATE daily_summary_reviews
           SET ai_insights = $1,
               updated_at = NOW()
           WHERE id = $2 AND status = 'draft'
           RETURNING id
         )
         ${SUMMARY_SELECT}
         WHERE r.id IN (SELECT id FROM changed)
         LIMIT 1`,
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
    ${SUMMARY_SELECT}
    WHERE r.status = 'draft'
        ORDER BY r.summary_date DESC
    LIMIT $1
  `
    const result = await query<RawDailySummaryRow>(sql, [limit])
    return result.rows.map(mapRow)
}
