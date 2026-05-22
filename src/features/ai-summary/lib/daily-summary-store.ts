// Daily Summary Store — EPIC 9 + EPIC-DB2
// Reads computed metrics from daily_summaries_mv and stores editable workflow
// fields in daily_summary_reviews.

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { DailySummary, DailySummaryInput } from '../types/daily-summary'
import { normalizeWorkflowInsights, normalizeWorkflowSummaryText } from './workflow-summary-normalizer'
import {
    DAILY_SUMMARY_SELECT,
    mapDailySummaryRow,
    type RawDailySummaryRow,
} from './daily-summary-row-mapper'

/**
 * Upsert a daily summary row. Saves as draft (US-9.2).
 * If a row for the same date already exists it is overwritten (idempotent).
 */
export async function upsertDailySummary(
    input: DailySummaryInput
): Promise<DailySummary> {
    const aiSummary = normalizeWorkflowSummaryText(input.aiSummary) ?? null
    const aiInsights = normalizeWorkflowInsights(input.aiInsights ?? [])
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
        aiSummary,
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
    const sql = `${DAILY_SUMMARY_SELECT}
    WHERE r.id = $1
    LIMIT 1`
    const result = await query<RawDailySummaryRow>(sql, [id])
    const row = result.rows[0]
    return row ? mapDailySummaryRow(row) : null
}

/**
 * Fetch a single daily summary by date string (YYYY-MM-DD).
 * Returns null if no summary has been generated for that date yet.
 */
export async function getDailySummaryByDate(
    dateStr: string
): Promise<DailySummary | null> {
    const sql = `
    ${DAILY_SUMMARY_SELECT}
        WHERE r.summary_date = $1
    LIMIT 1
  `
    const result = await query<RawDailySummaryRow>(sql, [dateStr])
    const row = result.rows[0]
    return row ? mapDailySummaryRow(row) : null
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
    ${DAILY_SUMMARY_SELECT}
    WHERE r.status = 'published'
        ORDER BY r.summary_date DESC
    LIMIT $1
  `
            : `
    ${DAILY_SUMMARY_SELECT}
        ORDER BY r.summary_date DESC
    LIMIT $1
  `
    const result = await query<RawDailySummaryRow>(sql, [limit])
    return result.rows.map(mapDailySummaryRow)
}
