// AI Summary — Read Queries
// EPIC 9: US-9.5 History view, US-9.3 Review view

import 'server-only'
import { query } from '@/shared/lib/db'
import type { DailySummary } from '../types/summary'

interface RawSummaryRow {
  id: string
  summaryDate: string
  totalPatients: string
  totalTransitions: string
  avgTatMs: string | null
  delayedTransitions: string
  delayRate: string
  bedsUsed: string
  aiText: string | null
  confidenceScore: string | null
  aiModel: string | null
  status: string
  supervisorNotes: string | null
  reviewedText: string | null
  approvedBy: string | null
  approvedAt: Date | null
  rejectedBy: string | null
  rejectedAt: Date | null
  rejectionReason: string | null
  createdAt: Date
  updatedAt: Date
}

const BASE_SELECT = `
  SELECT
    ds.id,
    ds.summary_date::text          AS "summaryDate",
    ds.total_patients              AS "totalPatients",
    ds.total_transitions           AS "totalTransitions",
    ds.avg_tat_ms                  AS "avgTatMs",
    ds.delayed_transitions         AS "delayedTransitions",
    ds.delay_rate                  AS "delayRate",
    ds.beds_used                   AS "bedsUsed",
    ds.ai_text                     AS "aiText",
    ds.confidence_score            AS "confidenceScore",
    ds.ai_model                    AS "aiModel",
    ds.status::text                AS status,
    ds.supervisor_notes            AS "supervisorNotes",
    ds.reviewed_text               AS "reviewedText",
    approver.username              AS "approvedBy",
    ds.approved_at                 AS "approvedAt",
    rejecter.username              AS "rejectedBy",
    ds.rejected_at                 AS "rejectedAt",
    ds.rejection_reason            AS "rejectionReason",
    ds.created_at                  AS "createdAt",
    ds.updated_at                  AS "updatedAt"
  FROM daily_summaries ds
  LEFT JOIN users approver ON approver.id = ds.approved_by
  LEFT JOIN users rejecter ON rejecter.id = ds.rejected_by`

function mapRow(row: RawSummaryRow): DailySummary {
  return {
    id:                 row.id,
    summaryDate:        row.summaryDate,
    totalPatients:      parseInt(row.totalPatients, 10),
    totalTransitions:   parseInt(row.totalTransitions, 10),
    avgTatMs:           row.avgTatMs !== null ? parseInt(row.avgTatMs, 10) : null,
    delayedTransitions: parseInt(row.delayedTransitions, 10),
    delayRate:          parseFloat(row.delayRate),
    bedsUsed:           parseInt(row.bedsUsed, 10),
    aiText:             row.aiText,
    confidenceScore:    row.confidenceScore !== null ? parseInt(row.confidenceScore, 10) : null,
    aiModel:            row.aiModel,
    status:             row.status as DailySummary['status'],
    supervisorNotes:    row.supervisorNotes,
    reviewedText:       row.reviewedText,
    approvedBy:         row.approvedBy,
    approvedAt:         row.approvedAt ?? null,
    rejectedBy:         row.rejectedBy,
    rejectedAt:         row.rejectedAt ?? null,
    rejectionReason:    row.rejectionReason,
    createdAt:          row.createdAt,
    updatedAt:          row.updatedAt,
  }
}

/** Fetch a single summary by calendar date (YYYY-MM-DD). Returns null if not generated yet. */
export async function getSummaryByDate(date: string): Promise<DailySummary | null> {
  const result = await query<RawSummaryRow>(
    `${BASE_SELECT} WHERE ds.summary_date = $1`,
    [date],
  )
  return result.rows[0] ? mapRow(result.rows[0]) : null
}

/** Fetch a single summary by UUID. */
export async function getSummaryById(id: string): Promise<DailySummary | null> {
  const result = await query<RawSummaryRow>(
    `${BASE_SELECT} WHERE ds.id = $1`,
    [id],
  )
  return result.rows[0] ? mapRow(result.rows[0]) : null
}

/** List summaries newest-first with optional pagination. */
export async function listSummaries(limit = 30, offset = 0): Promise<DailySummary[]> {
  const result = await query<RawSummaryRow>(
    `${BASE_SELECT}
     ORDER BY ds.summary_date DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  )
  return result.rows.map(mapRow)
}
