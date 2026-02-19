import { getAll } from '@/shared/lib/db-helpers'
import { getAuditLogs } from '@/shared/lib/audit'
import { requireAdmin } from './auth'
import type { UserSummary } from '../types/user'

/**
 * Get all users with their details
 * Epic 5: US-5.3 - User Management
 * 
 * Now uses shared getAll helper for consistency
 */
export async function getAllUsers() {
    await requireAdmin()

    // Using shared db helper for consistency with proper typing
    return getAll<UserSummary>('users', undefined, [], 'created_at DESC')
}

/**
 * Get user management logs for audit trail
 * Epic 5: US-5.3 - User Management
 * US-5.3 Acceptance Criteria: "User management actions are logged"
 * 
 * @param userId - Optional user ID to filter logs
 * @returns Array of log entries with user details
 * 
 * Now uses shared audit system which tracks all entities
 */
export async function getUserLogs(userId?: string) {
    await requireAdmin()

    // Using shared audit system - entity_type = 'user'
    return getAuditLogs('user', userId, 100)
}

/**
 * Get all active wards (used to populate ward assignment dropdowns)
 * No auth required — ward names are not sensitive data
 */
export async function getWards(): Promise<Array<{ id: string; name: string; code: string }>> {
    return getAll('wards', 'is_active = true', [], 'name ASC')
}
