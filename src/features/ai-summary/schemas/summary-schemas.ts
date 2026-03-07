// AI Summary Schemas
// EPIC 9: Daily AI Summary Generator (US-9.3, US-9.5)

import { z } from 'zod'
import { piiRefine } from '@/shared/lib/pii'

export const generateSummarySchema = z.object({
  /** ISO date string YYYY-MM-DD — defaults to yesterday if omitted */
  summaryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date').optional(),
})

// US-17.6/17.8: PII-safe note validator
const piiSafeOptional = z.string().max(1000).optional().superRefine((val, ctx) => {
  if (val) piiRefine(val, ctx)
})

export const reviewSummarySchema = z.object({
  summaryId: z.string().uuid('Invalid summary ID'),
  reviewedText: z.string().min(50, 'Reviewed text must be at least 50 characters').max(5000),
  supervisorNotes: piiSafeOptional,
})

export const approveSummarySchema = z.object({
  summaryId: z.string().uuid('Invalid summary ID'),
  reviewedText: z.string().min(50).max(5000),
  supervisorNotes: piiSafeOptional,
})

export const rejectSummarySchema = z.object({
  summaryId: z.string().uuid('Invalid summary ID'),
  rejectionReason: z.string().min(5, 'Please provide a reason').max(500).superRefine((val, ctx) => {
    piiRefine(val, ctx)
  }),
})

export type GenerateSummaryInput  = z.infer<typeof generateSummarySchema>
export type ReviewSummaryInput    = z.infer<typeof reviewSummarySchema>
export type ApproveSummaryInput   = z.infer<typeof approveSummarySchema>
export type RejectSummaryInput    = z.infer<typeof rejectSummarySchema>
