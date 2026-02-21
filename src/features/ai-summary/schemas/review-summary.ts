// Zod schemas for EPIC 9: Daily AI Summary review workflow (US-9.2, US-9.3, US-9.4)
// Validates approve, reject, edit, and flag inputs.

import { z } from 'zod'

const uuidSchema = z.string().uuid('Invalid summary or insight ID')

const aiInsightSchema = z.object({
    id: z.string().min(1),
    text: z.string().min(1).max(500),
    confidence: z.number().min(0).max(100),
    category: z.enum(['trend', 'bottleneck', 'success', 'volume', 'metric']).optional(),
    flagged: z.boolean().optional(),
})

export const approveSummarySchema = z.object({
    id: uuidSchema,
})

// US-9.4: reason is required — rejection without an explanation is not permitted.
export const rejectSummarySchema = z.object({
    id: uuidSchema,
    reason: z.string().min(10, 'Rejection reason is required (minimum 10 characters)').max(500),
})

export const updateSummaryDraftSchema = z.object({
    id: uuidSchema,
    aiSummary: z.string().min(1).max(2000),
    aiInsights: z.array(aiInsightSchema),
})

export const flagInsightSchema = z.object({
    summaryId: uuidSchema,
    insightId: z.string().min(1),
})

export type ApproveSummaryInput = z.infer<typeof approveSummarySchema>
export type RejectSummaryInput = z.infer<typeof rejectSummarySchema>
export type UpdateSummaryDraftInput = z.infer<typeof updateSummaryDraftSchema>
export type FlagInsightInput = z.infer<typeof flagInsightSchema>
