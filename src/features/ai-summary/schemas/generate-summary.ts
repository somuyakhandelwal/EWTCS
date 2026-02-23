// Zod validation schemas for EPIC 9: Daily AI Summary
// Used to validate API inputs before triggering aggregation.

import { z } from 'zod'

/** ISO date string YYYY-MM-DD */
const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/

export const generateSummarySchema = z.object({
    /**
     * The date to aggregate. Defaults to yesterday (UTC) if not provided.
     * Must be in YYYY-MM-DD format.
     */
    date: z
        .string()
        .regex(isoDateRegex, 'Date must be in YYYY-MM-DD format')
        .optional(),
})

export type GenerateSummaryInput = z.infer<typeof generateSummarySchema>
