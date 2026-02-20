import { z } from 'zod'

/**
 * US-5.5: User-initiated change-password schema
 * Used on the /change-password forced-change page.
 * Password rules mirror the project's existing minimum (6 chars) and add
 * uppercase + digit requirements for temp-password replacement hardening.
 */
export const changePasswordSchema = z
    .object({
        newPassword: z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
            .regex(/[0-9]/, 'Must contain at least one number'),
        confirmPassword: z.string().min(1, 'Please confirm your password'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    })

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
