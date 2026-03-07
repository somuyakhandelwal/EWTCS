'use server'

import bcrypt from 'bcrypt'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifySession, deleteSession } from '@/shared/lib/session'
import { changePasswordSchema } from '@/features/auth/schemas/change-password-schema'
import { applyNewPassword } from '@/features/auth/lib/password-reset-db'
import { invalidateToken } from '@/shared/lib/auth-service'
import { logAudit } from '@/shared/lib/audit'
import { logger } from '@/shared/config/logger'

/**
 * US-5.5 AC: User changes their own password after admin-issued temp password.
 * Only reachable from /change-password (enforced by middleware).
 * On success:
 *  - clears the must_change_password flag
 *  - blacklists the current JWT so other active sessions are invalidated
 *  - creates a fresh session
 *  - redirects to the role-appropriate dashboard
 */
export async function changePasswordAction(
    prevState: unknown,
    formData: FormData
): Promise<{ success?: boolean; message?: string; errors?: Record<string, string[]> }> {
    // Verify active session — user must be logged in to change password
    const session = await verifySession()
    if (!session) {
        redirect('/login')
    }

    const result = changePasswordSchema.safeParse({
        newPassword: formData.get('newPassword'),
        confirmPassword: formData.get('confirmPassword'),
    })

    if (!result.success) {
        return {
            success: false,
            errors: result.error.flatten().fieldErrors as Record<string, string[]>,
        }
    }

    const { newPassword } = result.data

    try {
        const passwordHash = await bcrypt.hash(newPassword, 10)

        // Clear flag + set new password in DB
        await applyNewPassword(session.userId, passwordHash)

        // Blacklist the current JWT so any other browser/device using
        // the old session cookie is immediately logged out.
        const cookieStore = await cookies()
        const currentToken = cookieStore.get('session')?.value
        if (currentToken) {
            await invalidateToken(currentToken)
        }

        // Drop the old session cookie and let the redirect force a fresh login
        await deleteSession()

        // Audit trail
        await logAudit({
            actionType: 'CHANGE_PASSWORD',
            entityType: 'user',
            entityId: session.userId,
            performedBy: session.userId,
            changes: { reason: 'User changed password after admin reset' },
        })

        logger.info('User changed their password — old session invalidated', { userId: session.userId })
    } catch (error) {
        logger.error('changePasswordAction failed', error as Error)
        return { success: false, message: 'Failed to update password. Please try again.' }
    }

    // After blacklisting the old token, send the user back to /login
    // so a fresh session is created with the new password.
    redirect('/login')
}

