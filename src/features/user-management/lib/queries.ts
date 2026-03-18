import { getAll } from '@/shared/lib/db-helpers'
import { getAuditLogs } from '@/shared/lib/audit'
import { requireAdmin } from './auth'
import { query } from '@/shared/lib/db'
import type { UserSummary } from '../types/user'

/**
 * Get all users with their details
 * Epic 5: US-5.3 - User Management
 *
 * Uses an explicit column list — never SELECT * — to prevent
 * password_hash and other sensitive columns from leaking into
 * the admin UI at runtime even if TypeScript types are widened.
 */
export async function getAllUsers(): Promise<UserSummary[]> {
    await requireAdmin()

    const { rows } = await query<UserSummary>(
        `SELECT id, username, role, is_active, created_at, updated_at, ward_id
         FROM users
         ORDER BY created_at DESC`
    )
    return rows
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
