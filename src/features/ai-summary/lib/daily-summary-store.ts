// Daily Summary Store — EPIC 9 + EPIC-DB2
// Reads computed metrics from daily_summaries_mv and stores editable workflow
// fields in daily_summary_reviews.

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { DailySummary, DailySummaryInput, AiInsight } from '../types/daily-summary'

// Raw DB row before camelCase mapping.
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
    LEFT JOIN daily_summaries_mv mv ON r.summary_date = mv.summary_date
`

function parseAiInsights(raw: unknown): AiInsight[] {
    if (!Array.isArray(raw)) return []
    return raw.filter((x): x is AiInsight => Boolean(x && typeof x === 'object'
        && typeof (x as AiInsight).id === 'string'
        && typeof (x as AiInsight).text === 'string'
        && typeof (x as AiInsight).confidence === 'number'))
        .map(x => ({ ...x, confidence: Math.max(0, Math.min(100, x.confidence)) }))
}

/** Map a raw pg row to the typed DailySummary shape. */
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

/**
 * Upsert a daily summary row. Saves as draft (US-9.2).
 * If a row for the same date already exists it is overwritten (idempotent).
 */
export async function upsertDailySummary(
    input: DailySummaryInput
): Promise<DailySummary> {
    const aiInsights = input.aiInsights ?? []
    const sql = `
    INSERT INTO daily_summary_reviews (
      summary_date,
      ai_summary,
      metadata,
      status,
      ai_insights,
      reviewed_by,
      reviewed_at,
      published_at,
      updated_at
    ) VALUES ($1, $2, $3, 'draft', $4, NULL, NULL, NULL, NOW())
    ON CONFLICT (summary_date) DO UPDATE SET
      ai_summary            = EXCLUDED.ai_summary,
      metadata              = EXCLUDED.metadata,
      status                = 'draft',
      ai_insights           = EXCLUDED.ai_insights,
      reviewed_by           = NULL,
      reviewed_at           = NULL,
      published_at          = NULL,
      updated_at            = NOW()
    RETURNING id
  `

    const result = await query<{ id: string }>(sql, [
        input.summaryDate,
        input.aiSummary ?? null,
        JSON.stringify(input.metadata),
        JSON.stringify(aiInsights),
    ])

    const saved = result.rows[0]
    if (!saved) throw new Error('Upsert returned no row — database error')

    const summary = await getDailySummaryByDate(input.summaryDate)
    if (!summary) throw new Error(`Unable to load summary for ${input.summaryDate}`)

    logger.info(`[ai-summary] Summary upserted for ${input.summaryDate}`)
    return summary
}

/**
 * Refresh daily summary materialized view.
 */
export async function refreshDailySummariesMaterializedView(): Promise<void> {
    await query('REFRESH MATERIALIZED VIEW CONCURRENTLY daily_summaries_mv')
}

/**
 * Fetch a single daily summary by ID.
 */
export async function getDailySummaryById(
    id: string
): Promise<DailySummary | null> {
    const sql = `${SUMMARY_SELECT}
    WHERE r.id = $1
    LIMIT 1`
    const result = await query<RawDailySummaryRow>(sql, [id])
    const row = result.rows[0]
    return row ? mapRow(row) : null
}

/**
 * Fetch a single daily summary by date string (YYYY-MM-DD).
 * Returns null if no summary has been generated for that date yet.
 */
export async function getDailySummaryByDate(
    dateStr: string
): Promise<DailySummary | null> {
    const sql = `
    ${SUMMARY_SELECT}
        WHERE r.summary_date = $1
    LIMIT 1
  `
    const result = await query<RawDailySummaryRow>(sql, [dateStr])
    const row = result.rows[0]
    return row ? mapRow(row) : null
}

/** Status filter for read APIs: 'all' or 'published' (US-9.2: published-only for non-review) */
export type SummaryStatusFilter = 'all' | 'published'

/**
 * Fetch the most recent N daily summaries, ordered newest-first.
 * Use statusFilter='published' to exclude drafts (e.g. for auditors).
 */
export async function getRecentDailySummaries(
    limit: number = 30,
    statusFilter: SummaryStatusFilter = 'all'
): Promise<DailySummary[]> {
    const sql =
        statusFilter === 'published'
            ? `
    ${SUMMARY_SELECT}
    WHERE r.status = 'published'
        ORDER BY r.summary_date DESC
    LIMIT $1
  `
            : `
    ${SUMMARY_SELECT}
        ORDER BY r.summary_date DESC
    LIMIT $1
  `
    const result = await query<RawDailySummaryRow>(sql, [limit])
    return result.rows.map(mapRow)
}
