// AI Summary — Write Mutations
// EPIC 9: US-9.1 upsert, US-9.3 approve, US-9.5 reject

import 'server-only'
import { query } from '@/shared/lib/db'
import type { DailyStats } from '../types/summary'
import type { OpenAIResult } from './openai-client'

/**
 * Insert or update a daily summary row (idempotent on summary_date).
 * Called by generateSummaryAction after aggregation + AI generation.
 */
export async function upsertSummary(
  stats: DailyStats,
  aiResult: OpenAIResult,
): Promise<string> {
  const result = await query<{ id: string }>(
    `INSERT INTO daily_summaries (
       summary_date, total_patients, total_transitions, avg_tat_ms,
       delayed_transitions, delay_rate, beds_used,
       ai_text, confidence_score, ai_model,
       status, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft',NOW())
     ON CONFLICT (summary_date) DO UPDATE SET
       total_patients      = EXCLUDED.total_patients,
       total_transitions   = EXCLUDED.total_transitions,
       avg_tat_ms          = EXCLUDED.avg_tat_ms,
       delayed_transitions = EXCLUDED.delayed_transitions,
       delay_rate          = EXCLUDED.delay_rate,
       beds_used           = EXCLUDED.beds_used,
       ai_text             = EXCLUDED.ai_text,
       confidence_score    = EXCLUDED.confidence_score,
       ai_model            = EXCLUDED.ai_model,
       status              = CASE
                               WHEN daily_summaries.status = 'draft' THEN 'draft'::summary_status
                               ELSE daily_summaries.status
                             END,
       updated_at          = NOW()
     RETURNING id`,
    [
      stats.date,
      stats.totalPatients,
      stats.totalTransitions,
      stats.avgTatMs,
      stats.delayedTransitions,
      stats.delayRate,
      stats.bedsUsed,
      aiResult.text,
      aiResult.confidenceScore,
      aiResult.model,
    ],
  )
  return result.rows[0].id
}

/**
 * Approve a draft summary (US-9.3 / US-9.5).
 * Stores the supervisor-edited text and marks status = 'approved'.
 */
export async function approveSummary(
  summaryId: string,
  approvedByUserId: string,
  reviewedText: string,
  supervisorNotes?: string,
): Promise<void> {
  await query(
    `UPDATE daily_summaries
     SET status           = 'approved',
         reviewed_text    = $2,
         supervisor_notes = $3,
         approved_by      = $4,
         approved_at      = NOW(),
         updated_at       = NOW()
     WHERE id = $1 AND status = 'draft'`,
    [summaryId, reviewedText, supervisorNotes ?? null, approvedByUserId],
  )
}

/**
 * Reject a draft summary (US-9.5).
 * Records who rejected it and why.
 */
export async function rejectSummary(
  summaryId: string,
  rejectedByUserId: string,
  rejectionReason: string,
): Promise<void> {
  await query(
    `UPDATE daily_summaries
     SET status           = 'rejected',
         rejected_by      = $2,
         rejected_at      = NOW(),
         rejection_reason = $3,
         updated_at       = NOW()
     WHERE id = $1 AND status = 'draft'`,
    [summaryId, rejectedByUserId, rejectionReason],
  )
}
