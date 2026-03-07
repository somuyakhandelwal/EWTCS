import { z } from 'zod'
import type { FeedbackCategory } from '@/features/adoption/types'

const FEEDBACK_CATEGORIES = ['general', 'bug', 'feature', 'training', 'usability'] as const satisfies readonly FeedbackCategory[]

export const feedbackSchema = z.object({
    category: z.enum(FEEDBACK_CATEGORIES, {
        error: 'Please select a valid category',
    }),
    rating: z
        .number()
        .int()
        .min(1, 'Rating must be between 1 and 5')
        .max(5, 'Rating must be between 1 and 5')
        .nullable()
        .optional(),
    message: z
        .string()
        .max(2000, 'Message must be 2000 characters or fewer')
        .trim()
        .nullable()
        .optional(),
})

export type FeedbackInput = z.infer<typeof feedbackSchema>

// At least one of rating or message must be provided
export const feedbackInputSchema = feedbackSchema.refine(
    (d) => d.rating != null || (d.message != null && d.message.length > 0),
    { message: 'Please provide a rating or a message' }
)
