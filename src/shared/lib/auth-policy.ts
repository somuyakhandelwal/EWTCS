import 'server-only'
import { logAudit, type AuditAction } from '@/shared/lib/audit'

export type Resource =
    | 'users'
    | 'beds'
    | 'shifts'
    | 'reports'
    | 'settings'
    | 'audit'
    | 'analytics'
    | 'summary'
    | 'export'
    | 'import'
    | 'retention'
    | 'system'
    | '*'

export type ActionType = 'read' | 'write' | 'delete' | '*'

export type PolicyContext = {
    actionType?: AuditAction | string
    entityType?: string
    entityId?: string
}

export type Policy = Record<string, Partial<Record<Resource, ActionType[]>>>

export const rolePolicies: Policy = {
    admin: {
        '*': ['read', 'write', 'delete', '*'], // Complete access
    },
    supervisor: {
        users: ['read'],
        beds: ['read', 'write'],
        shifts: ['read', 'write'],
        reports: ['read', 'write'],
        settings: ['read'],
        audit: ['read'],
        analytics: ['read', 'write'],
        summary: ['read', 'write'],
        export: ['read', 'write'],
        import: ['read', 'write'],
        retention: ['read'],
    },
    nurse: {
        beds: ['read', 'write'],
        shifts: ['read', 'write'],
        reports: ['read'],
        analytics: ['read'],
        summary: ['read', 'write'],
        users: ['read'],
    },
    auditor: {
        users: ['read'],
        beds: ['read'],
        shifts: ['read'],
        reports: ['read'],
        settings: ['read'],
        audit: ['read'],
        analytics: ['read'],
        summary: ['read'],
        export: ['read'],
        retention: ['read'],
    },
    housekeeping: {
        beds: ['read', 'write'],
    },
    cardiologist: {
        beds: ['read'],
        reports: ['read', 'write'],
        summary: ['read', 'write'],
        users: ['read'],
    },
    cath_lab_nurse: {
        beds: ['read', 'write'],
        reports: ['read'],
        summary: ['read', 'write'],
        users: ['read'],
    }
}

export function hasPermission(role: string, resource: Resource, action: ActionType): boolean {
    const rolePolicy = rolePolicies[role]
    if (!rolePolicy) return false

    // Wildcard resource
    const wildcardResource = rolePolicy['*']
    if (wildcardResource && (wildcardResource.includes(action) || wildcardResource.includes('*'))) {
        return true
    }

    // Specific resource
    const resourcePolicy = rolePolicy[resource]
    if (!resourcePolicy) return false

    return resourcePolicy.includes(action) || resourcePolicy.includes('*')
}

// Log policy violations
export async function logPolicyViolation(
    session: { userId?: string; role?: string } | null | undefined,
    resource: Resource,
    action: ActionType,
    context?: PolicyContext
) {
    try {
        await logAudit({
            actionType: (context?.actionType || `${action.toUpperCase()}_DENIED`) as AuditAction,
            entityType: context?.entityType || resource,
            entityId: context?.entityId || 'security-policy',
            performedBy: session?.userId || 'system',
            reason: `Access control policy violation: user lacks ${action} permission on ${resource}`,
            metadata: {
                role: session?.role,
                resource,
                action,
                attemptedPath: 'backend'
            },
        })
    } catch {
        // Must proceed even if logging fails
    }
}
