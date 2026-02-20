import { z } from 'zod'

/**
 * US-5.5: Admin-initiated password reset schema
 * Validates the userId target for a forced temp-password reset.
 */
export const adminResetPasswordSchema = z.object({
    userId: z.string().uuid('Invalid user ID'),
})

export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>
