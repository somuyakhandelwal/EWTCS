import { redirect } from 'next/navigation'
import { logAudit } from '@/shared/lib/audit'
import { logger } from '@/shared/config/logger'
import { UNKNOWN_ACTOR_ID } from './auth-schema'

export function handleUserRedirect(role: string): never {
    if (role === 'admin') {
        redirect('/admin')
    } else if (role === 'supervisor') {
        redirect('/supervisor')
    } else if (role === 'auditor') {
        redirect('/analytics')
    } else if (role === 'cardiologist') {
        redirect('/cath-lab')
    } else if (role === 'cath_lab_nurse') {
        redirect('/cath-lab')
    } else {
        redirect('/dashboard')
    }
}

export async function logUnknownLoginAttempt(username: string, ipAddress: string) {
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

export function isRedirectError(error: unknown): boolean {
    return !!(
        error &&
        typeof error === 'object' &&
        'digest' in error &&
        typeof error.digest === 'string' &&
        error.digest.startsWith('NEXT_REDIRECT')
    )
}
