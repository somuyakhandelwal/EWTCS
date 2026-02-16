/**
 * Re-export shared audit utilities for user management
 * Epic 5: US-5.3 - User Management
 * 
 * This file now delegates to shared utilities in @/shared/lib/audit
 * for consistency across all features.
 * 
 * The generic audit system can track any entity (users, beds, patients, etc.)
 */
import { logAudit } from '@/shared/lib/audit'

/**
 * Log user management action to audit trail
 * Wrapper around generic logAudit for backward compatibility
 * 
 * @param actionType - Type of action (CREATE, UPDATE, DEACTIVATE, ACTIVATE)
 * @param targetUserId - ID of the user being acted upon
 * @param performedById - ID of the admin performing the action
 * @param changes - Object containing what was changed
 * @param reason - Optional reason for the action
 */
export async function logUserAction(
    actionType: string,
    targetUserId: string,
    performedById: string,
    changes?: Record<string, unknown>,
    reason?: string
) {
    return logAudit({
        actionType,
        entityType: 'user',
        entityId: targetUserId,
        performedBy: performedById,
        changes,
        reason
    })
}
