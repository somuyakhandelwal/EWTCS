// Daily Summary Store — EPIC 9: Daily AI Summary
// Handles reading and upserting daily summaries in the daily_summaries table.
// Idempotent: re-running for the same date safely overwrites the existing row.

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { DailySummary, DailySummaryInput, AiInsight } from '../types/daily-summary'

// Raw DB row before camelCase mapping (includes migration 034 columns)
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
        reviewed_by_display?: string | null
    reviewed_at?: string | null
    published_at?: string | null
    ai_insights?: unknown
}

const SUMMARY_SELECT = `
    SELECT ds.*, COALESCE(u.username, ds.reviewed_by::text) AS reviewed_by_display
    FROM daily_summaries ds
    LEFT JOIN users u ON u.id = ds.reviewed_by
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
        reviewedBy: row.reviewed_by_display ?? row.reviewed_by ?? undefined,
        reviewedAt: row.reviewed_at ?? undefined,
        publishedAt: row.published_at ?? undefined,
        // US-9.5: surface rejectionReason from JSONB metadata for history display
        rejectionReason: typeof metadata.rejectionReason === 'string'
            ? metadata.rejectionReason : undefined,
        aiInsights: parseAiInsights(row.ai_insights) ?? [],
        metadata,
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
    INSERT INTO daily_summaries
      (summary_date, total_patients, avg_stage_time_minutes, delay_count,
       avg_tat_minutes, total_beds_used, total_stage_updates, generated_at,
       ai_summary, metadata, status, ai_insights)
    VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8,$9,'draft',$10)
    ON CONFLICT (summary_date) DO UPDATE SET
      total_patients=EXCLUDED.total_patients,
      avg_stage_time_minutes=EXCLUDED.avg_stage_time_minutes,
      delay_count=EXCLUDED.delay_count, avg_tat_minutes=EXCLUDED.avg_tat_minutes,
      total_beds_used=EXCLUDED.total_beds_used,
      total_stage_updates=EXCLUDED.total_stage_updates,
      generated_at=NOW(), ai_summary=EXCLUDED.ai_summary,
      metadata=EXCLUDED.metadata, status='draft',
      ai_insights=EXCLUDED.ai_insights,
      reviewed_by=NULL, reviewed_at=NULL, published_at=NULL
    RETURNING *`
    const result = await query<RawDailySummaryRow>(sql, [
        input.summaryDate, input.totalPatients, input.avgStageTimeMinutes,
        input.delayCount, input.avgTatMinutes, input.totalBedsUsed,
        input.totalStageUpdates, input.aiSummary ?? null,
        JSON.stringify(input.metadata), JSON.stringify(aiInsights),
    ])
    const saved = result.rows[0]
    if (!saved) throw new Error('Upsert returned no row — database error')
    logger.info(`[ai-summary] Summary upserted for ${input.summaryDate}`)
    return mapRow(saved)
}

/**
 * Fetch a single daily summary by ID.
 */
export async function getDailySummaryById(
    id: string
): Promise<DailySummary | null> {
    const sql = `${SUMMARY_SELECT} WHERE ds.id = $1 LIMIT 1`
    const result = await query<RawDailySummaryRow>(sql, [id])
    const row = result.rows[0]
    return row ? mapRow(row) : null
}

/** Fetch a single daily summary by date string (YYYY-MM-DD). */
export async function getDailySummaryByDate(
    dateStr: string
): Promise<DailySummary | null> {
    const sql = `${SUMMARY_SELECT} WHERE ds.summary_date = $1 LIMIT 1`
    const result = await query<RawDailySummaryRow>(sql, [dateStr])
    const row = result.rows[0]
    return row ? mapRow(row) : null
}

/** Status filter for read APIs: 'all' | 'published' (US-9.2) or a specific status */
export type SummaryStatusFilter = 'all' | 'published' | 'draft' | 'rejected'

/**
 * Fetch the most recent N daily summaries, ordered newest-first.
 * Use statusFilter='published' to exclude drafts (e.g. for auditors).
 */
export async function getRecentDailySummaries(
    limit: number = 30,
    statusFilter: SummaryStatusFilter = 'all'
): Promise<DailySummary[]> {
    const sql =
        statusFilter === 'all'
            ? `${SUMMARY_SELECT} ORDER BY ds.summary_date DESC LIMIT $1`
            : `${SUMMARY_SELECT} WHERE ds.status = $2 ORDER BY ds.summary_date DESC LIMIT $1`
    const params = statusFilter === 'all' ? [limit] : [limit, statusFilter]
    const result = await query<RawDailySummaryRow>(sql, params)
    return result.rows.map(mapRow)
}

/**
 * Fetch summaries within an inclusive date range (US-9.5).
 * Use statusFilter to restrict by status ('all' returns every status).
 */
export async function getDailySummariesByDateRange(
    from: string,
    to: string,
    statusFilter: SummaryStatusFilter = 'all'
): Promise<DailySummary[]> {
    const sql =
        statusFilter === 'all'
            ? `${SUMMARY_SELECT}
               WHERE ds.summary_date BETWEEN $1 AND $2
               ORDER BY ds.summary_date DESC`
            : `${SUMMARY_SELECT}
               WHERE ds.summary_date BETWEEN $1 AND $2 AND ds.status = $3
               ORDER BY ds.summary_date DESC`
    const params = statusFilter === 'all' ? [from, to] : [from, to, statusFilter]
    const result = await query<RawDailySummaryRow>(sql, params)
    return result.rows.map(mapRow)
}

/**
 * Full-text search against the AI summary narrative (US-9.5).
 * Uses case-insensitive ILIKE. Auditors should pass statusFilter='published'.
 */
export async function searchDailySummaries(
    searchText: string,
    limit: number = 50,
    statusFilter: SummaryStatusFilter = 'all'
): Promise<DailySummary[]> {
    const pattern = `%${searchText}%`
    const sql =
        statusFilter === 'all'
            ? `${SUMMARY_SELECT}
               WHERE ds.ai_summary ILIKE $1
               ORDER BY ds.summary_date DESC
               LIMIT $2`
            : `${SUMMARY_SELECT}
               WHERE ds.ai_summary ILIKE $1 AND ds.status = $3
               ORDER BY ds.summary_date DESC
               LIMIT $2`
    const params =
        statusFilter === 'all' ? [pattern, limit] : [pattern, limit, statusFilter]
    const result = await query<RawDailySummaryRow>(sql, params)
    return result.rows.map(mapRow)
}
