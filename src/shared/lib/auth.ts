import 'server-only'
import { verifyActiveSession } from '@/shared/lib/active-session'
import { logAudit, type AuditAction } from '@/shared/lib/audit'

/**
 * Generic role-based access control utilities
 * Use these for any feature requiring role-based permissions
 */

/**
 * Verify user has specific role(s)
 * @param allowedRoles - Single role or array of allowed roles
 * @throws Error if user doesn't have required role
 * @returns Session object if authorized
 * 
 * @example
 * // Check for admin only
 * await requireRole('admin')
 * 
 * // Check for multiple roles
 * await requireRole(['admin', 'supervisor'])
 */
export async function requireRole(allowedRoles: string | string[]) {
    const session = await verifyActiveSession()
    
    if (!session) {
        throw new Error('Unauthorized: Authentication required')
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
    
    if (!roles.includes(session.role)) {
        throw new Error(`Unauthorized: Required role(s): ${roles.join(', ')}`)
    }

    return session
}

type WriteGuardContext = {
    actionType?: AuditAction
    entityType?: string
    entityId?: string
}

export function isReadOnlyRole(role: string) {
    return role === 'auditor'
}

export async function requireWriteRole(
    allowedRoles: string | string[],
    context?: WriteGuardContext
) {
    const session = await verifyActiveSession()

    if (!session) {
        throw new Error('Unauthorized: Authentication required')
    }

    if (isReadOnlyRole(session.role)) {
        try {
            await logAudit({
                actionType: context?.actionType || 'WRITE_DENIED_READ_ONLY',
                entityType: context?.entityType || 'authorization',
                entityId: context?.entityId || 'write-protected-resource',
                performedBy: session.userId,
                reason: 'Write operation denied in read-only audit mode',
                metadata: {
                    role: session.role,
                    mode: 'read-only',
                    allowedRoles: Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles],
                },
            })
        } catch {
            // Deny must still proceed even if audit logging fails
        }

        throw new Error('Read-only mode: auditors cannot perform write actions')
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
    if (!roles.includes(session.role)) {
        throw new Error(`Unauthorized: Required role(s): ${roles.join(', ')}`)
    }

    return session
}

/**
 * Verify user has admin role
 * Convenience wrapper for requireRole('admin')
 */
export async function requireAdmin() {
    return requireRole('admin')
}

export async function requireAdminWrite(context?: WriteGuardContext) {
    return requireWriteRole('admin', context)
}

/**
 * Verify user has supervisor or admin role
 * Convenience wrapper for requireRole(['admin', 'supervisor'])
 */
export async function requireSupervisorOrAdmin() {
    return requireRole(['admin', 'supervisor'])
}

/**
 * Get current session if exists, otherwise return null
 * Use this for optional authentication checks
 */
export async function getCurrentSession() {
    try {
        return await verifyActiveSession()
    } catch {
        return null
    }
}
