import type { DailySummary, AiInsight } from '../types/daily-summary'
import {
  normalizeWorkflowInsights,
  normalizeWorkflowSummaryText,
} from './workflow-summary-normalizer'

export interface RawDailySummaryRow {
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

export const DAILY_SUMMARY_SELECT = `
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
  return normalizeWorkflowInsights(
    raw
      .filter(
        (x): x is AiInsight =>
          Boolean(
            x &&
              typeof x === 'object' &&
              typeof (x as AiInsight).id === 'string' &&
              typeof (x as AiInsight).text === 'string' &&
              typeof (x as AiInsight).confidence === 'number'
          )
      )
      .map((x) => ({ ...x, confidence: Math.max(0, Math.min(100, x.confidence)) }))
  )
}

export function mapDailySummaryRow(row: RawDailySummaryRow): DailySummary {
  const status = row.status === 'published' || row.status === 'rejected' ? row.status : 'draft'
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
    aiSummary: normalizeWorkflowSummaryText(row.ai_summary ?? undefined),
    status,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    publishedAt: row.published_at ?? undefined,
    aiInsights: parseAiInsights(row.ai_insights) ?? [],
    metadata: (row.metadata ?? {}) as DailySummary['metadata'],
  }
}
