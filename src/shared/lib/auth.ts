import 'server-only'
import { verifyActiveSession } from '@/shared/lib/active-session'

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

/**
 * Verify user has admin role
 * Convenience wrapper for requireRole('admin')
 */
export async function requireAdmin() {
    return requireRole('admin')
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
