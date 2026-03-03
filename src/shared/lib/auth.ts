import 'server-only'
import { verifyActiveSession } from '@/shared/lib/active-session'
import { logAudit, type AuditAction } from '@/shared/lib/audit'
import {
    type Resource,
    type ActionType,
    type PolicyContext,
    hasPermission,
    logPolicyViolation
} from '@/shared/lib/auth-policy'

/**
 * Generic role-based access control utilities
 * Use these for any feature requiring role-based permissions
 */

// Main access guard
export async function checkPolicyGuard(
    resource: Resource,
    action: ActionType,
    allowedRoles?: string | string[],
    context?: PolicyContext
) {
    const session = await verifyActiveSession()
    if (!session) {
        throw new Error('Unauthorized: Authentication required')
    }

    const rolesArr = allowedRoles ? (Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]) : null

    // Backward compatible role check
    if (rolesArr && !rolesArr.includes(session.role)) {
        await logPolicyViolation(session, resource, action, context)
        throw new Error(`Unauthorized: Required role(s): ${rolesArr.join(', ')}`)
    }

    // Granular policy check
    if (!hasPermission(session.role, resource, action)) {
        await logPolicyViolation(session, resource, action, context)
        throw new Error(`Forbidden: Role ${session.role} cannot perform ${action} on ${resource}`)
    }

    return session
}

export async function requireReadRole(
    resource: Resource,
    allowedRoles?: string | string[],
    context?: PolicyContext
) {
    return checkPolicyGuard(resource, 'read', allowedRoles, context)
}

export async function requireDeleteRole(
    resource: Resource,
    allowedRoles?: string | string[],
    context?: PolicyContext
) {
    return checkPolicyGuard(resource, 'delete', allowedRoles, context)
}

// Legacy + Granular write guard
export async function requireWriteRole(
    resourceOrAllowedRoles: Resource | string | string[],
    context?: PolicyContext
) {
    // Check if what passed is a Resource to use granular RBAC
    const validResources = [
        'users', 'beds', 'shifts', 'reports', 'settings', 'audit',
        'analytics', 'summary', 'export', 'import', 'retention', '*'
    ];

    // If it's a string and matches our resources, treat it as Resource
    if (typeof resourceOrAllowedRoles === 'string' && validResources.includes(resourceOrAllowedRoles)) {
        return checkPolicyGuard(resourceOrAllowedRoles as Resource, 'write', undefined, context)
    }

    // Legacy logic...
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
                    allowedRoles: Array.isArray(resourceOrAllowedRoles) ? resourceOrAllowedRoles : [resourceOrAllowedRoles],
                },
            });
        } catch { }
        throw new Error('Read-only mode: auditors cannot perform write actions')
    }

    const roles = Array.isArray(resourceOrAllowedRoles) ? resourceOrAllowedRoles : [resourceOrAllowedRoles]
    if (!roles.includes(session.role)) {
        throw new Error(`Unauthorized: Required role(s): ${roles.join(', ')}`)
    }

    return session
}

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

export function isReadOnlyRole(role: string) {
    return role === 'auditor'
}

export async function requireAdmin() {
    return requireRole('admin')
}

export async function requireAdminWrite(context?: PolicyContext) {
    return requireWriteRole('admin', context)
}

export async function requireSupervisorOrAdmin() {
    return requireRole(['admin', 'supervisor'])
}

export async function getCurrentSession() {
    try {
        return await verifyActiveSession()
    } catch {
        return null
    }
}
