'use server'

import bcrypt from 'bcrypt'
import { randomBytes } from 'crypto'
import { adminResetPasswordSchema } from '@/features/user-management/schemas/password-reset-schema'
import { requireAdmin } from '@/features/user-management/lib/auth'
import { logUserAction } from '@/features/user-management/lib/audit'
import { setTempPassword } from '@/shared/lib/password-reset-db'
import { logger } from '@/shared/config/logger'

/**
 * US-5.5 AC: Admin can reset passwords manually.
 * Generates a secure temp password, sets must_change_password=TRUE,
 * and returns the plain-text temp password once so the admin can relay it.
 */
export async function adminResetPassword(
    prevState: unknown,
    formData: FormData
): Promise<{
    success: boolean
    message: string
    tempPassword?: string
}> {
    try {
        const session = await requireAdmin()

        const result = adminResetPasswordSchema.safeParse({
            userId: formData.get('userId'),
        })

        if (!result.success) {
            return { success: false, message: 'Invalid user ID' }
        }

        const { userId } = result.data

        // Generate a secure temporary password: "Temp@" + 6 random hex chars
        const tempPassword = 'Temp@' + randomBytes(3).toString('hex').toUpperCase()

        const passwordHash = await bcrypt.hash(tempPassword, 10)

        // Persist: set hashed password + must_change_password flag
        await setTempPassword(userId, passwordHash)

        // Audit log
        await logUserAction('RESET_PASSWORD', userId, session.userId, {
            reason: 'Admin-initiated password reset',
            tempPasswordSetAt: new Date().toISOString(),
        })

        logger.info('Admin reset password for user', { targetUserId: userId, performedBy: session.userId })

        return {
            success: true,
            message: 'Temporary password generated. Share it securely with the user.',
            tempPassword,
        }
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to reset password'
        logger.error('adminResetPassword failed', error as Error)
        return { success: false, message: msg }
    }
}
