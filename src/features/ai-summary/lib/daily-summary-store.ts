// Daily Summary Store — EPIC 9: Daily AI Summary
// Handles reading and upserting daily summaries in the daily_summaries table.
// Idempotent: re-running for the same date safely overwrites the existing row.

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { DailySummary, DailySummaryInput } from '../types/daily-summary'

// Raw DB row before camelCase mapping
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
}

/** Map a raw pg row to the typed DailySummary shape. */
function mapRow(row: RawDailySummaryRow): DailySummary {
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
        metadata: row.metadata ?? {},
    }
}

/**
 * Upsert a daily summary row.
 * If a row for the same date already exists it is overwritten (idempotent).
 * Returns the saved DailySummary record.
 */
export async function upsertDailySummary(
    input: DailySummaryInput
): Promise<DailySummary> {
    const sql = `
    INSERT INTO daily_summaries (
      summary_date,
      total_patients,
      avg_stage_time_minutes,
      delay_count,
      avg_tat_minutes,
      total_beds_used,
      total_stage_updates,
      generated_at,
      ai_summary,
      metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9)
    ON CONFLICT (summary_date) DO UPDATE SET
      total_patients        = EXCLUDED.total_patients,
      avg_stage_time_minutes = EXCLUDED.avg_stage_time_minutes,
      delay_count           = EXCLUDED.delay_count,
      avg_tat_minutes       = EXCLUDED.avg_tat_minutes,
      total_beds_used       = EXCLUDED.total_beds_used,
      total_stage_updates   = EXCLUDED.total_stage_updates,
      generated_at          = NOW(),
      ai_summary            = EXCLUDED.ai_summary,
      metadata              = EXCLUDED.metadata
    RETURNING *
  `

    const result = await query<RawDailySummaryRow>(sql, [
        input.summaryDate,
        input.totalPatients,
        input.avgStageTimeMinutes,
        input.delayCount,
        input.avgTatMinutes,
        input.totalBedsUsed,
        input.totalStageUpdates,
        input.aiSummary ?? null,
        JSON.stringify(input.metadata),
    ])

    const saved = result.rows[0]
    if (!saved) throw new Error('Upsert returned no row — database error')

    logger.info(`[ai-summary] Summary upserted for ${input.summaryDate}`)
    return mapRow(saved)
}

/**
 * Fetch a single daily summary by date string (YYYY-MM-DD).
 * Returns null if no summary has been generated for that date yet.
 */
export async function getDailySummaryByDate(
    dateStr: string
): Promise<DailySummary | null> {
    const sql = `
    SELECT * FROM daily_summaries
    WHERE summary_date = $1
    LIMIT 1
  `
    const result = await query<RawDailySummaryRow>(sql, [dateStr])
    const row = result.rows[0]
    return row ? mapRow(row) : null
}

/**
 * Fetch the most recent N daily summaries, ordered newest-first.
 */
export async function getRecentDailySummaries(
    limit: number = 30
): Promise<DailySummary[]> {
    const sql = `
    SELECT * FROM daily_summaries
    ORDER BY summary_date DESC
    LIMIT $1
  `
    const result = await query<RawDailySummaryRow>(sql, [limit])
    return result.rows.map(mapRow)
}
