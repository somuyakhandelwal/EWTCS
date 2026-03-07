// Schema — EPIC 9 (US-9.5): History query validation
// Validates inputs for fetchDailySummaryHistory server action.

import { z } from 'zod'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Validates an optional YYYY-MM-DD string. */
const isoDateOptional = z
    .string()
    .regex(ISO_DATE, 'Date must be YYYY-MM-DD')
    .optional()

/**
 * Input schema for the history query action.
 * All fields are optional; if `search` is set it takes priority over date range.
 */
export const historyQuerySchema = z
    .object({
        /** Start of date range (inclusive). Defaults to 30 days ago. */
        from: isoDateOptional,
        /** End of date range (inclusive). Defaults to today. */
        to: isoDateOptional,
        /** Free-text search against AI summary narrative. */
        search: z.string().max(200, 'Search query too long').optional(),
        /** Status filter. 'all' is only allowed for admin/supervisor. */
        status: z
            .enum(['all', 'published', 'draft', 'rejected'])
            .default('all'),
        /** Maximum results to return (1–365). */
        limit: z.number().int().min(1).max(365).default(90),
    })
    .refine(
        (d) => {
            if (d.from && d.to) return d.from <= d.to
            return true
        },
        { message: '`from` must be on or before `to`', path: ['from'] }
    )

export type HistoryQueryInput = z.input<typeof historyQuerySchema>
export type HistoryQueryParsed = z.output<typeof historyQuerySchema>
