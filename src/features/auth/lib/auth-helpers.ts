import pool from '@/shared/lib/db'
import { logAudit } from '@/shared/lib/audit'
import { UNKNOWN_ACTOR_ID } from '../lib/auth-schema'
import { logger } from '@/shared/config/logger'
import { redirect } from 'next/navigation'

/** Handles audit logging for failed login attempts where user is not found */
export async function logUnknownUserLoginAttempt(username: string, ipAddress: string) {
    try {
        await logAudit({
            actionType: 'LOGIN_FAILED',
            entityType: 'auth',
            entityId: UNKNOWN_ACTOR_ID,
            performedBy: UNKNOWN_ACTOR_ID,
            reason: 'Login failed: user not found',
            metadata: { username },
            ipAddress,
        })
    } catch {
        logger.warn('Could not write audit log for unknown-user login attempt', { username })
    }
}

interface User {
    id: string
    username: string
    role: string
    failed_login_attempts?: number
    lockout_until?: Date | null
}

/** Handles account lockout logic and database updates */
export async function handleFailedLoginAttempt(user: User, ipAddress: string) {
    const attempts = (user.failed_login_attempts || 0) + 1
    let lockoutUntil = null

    if (attempts >= 5) {
        lockoutUntil = new Date(Date.now() + 15 * 60000) // 15 mins lock
    }

    await pool.query(
        'UPDATE users SET failed_login_attempts = $1, lockout_until = $2, updated_at = NOW() WHERE id = $3',
        [attempts, lockoutUntil, user.id]
    )

    await logAudit({
        actionType: 'LOGIN_FAILED',
        entityType: 'user',
        entityId: user.id,
        performedBy: user.id,
        reason: lockoutUntil
            ? 'Login failed: invalid password, account locked'
            : 'Login failed: invalid password',
        metadata: {
            username: user.username,
            role: user.role,
            failedAttempts: attempts,
            lockoutUntil,
        },
        ipAddress,
    })
}

/** Redirects user based on their assigned role */
export function redirectByRole(role: string) {
    if (role === 'admin') {
        redirect('/admin')
    } else if (role === 'supervisor') {
        redirect('/supervisor')
    } else if (role === 'auditor') {
        redirect('/analytics')
    } else {
        redirect('/dashboard')
    }
}
