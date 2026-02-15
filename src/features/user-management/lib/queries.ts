import pool from '@/shared/lib/db'
import { requireAdmin } from './auth'

/**
 * Get all users with their details
 * Epic 5: US-5.3 - User Management
 */
export async function getAllUsers() {
    await requireAdmin()

    const result = await pool.query(
        `SELECT id, username, role, is_active, created_at, updated_at 
        FROM users 
        ORDER BY created_at DESC`
    )

    return result.rows
}

/**
 * Get user management logs for audit trail
 * Epic 5: US-5.3 - User Management
 * US-5.3 Acceptance Criteria: "User management actions are logged"
 * 
 * @param userId - Optional user ID to filter logs
 * @returns Array of log entries with user details
 */
export async function getUserLogs(userId?: string) {
    await requireAdmin()

    const query = userId
        ? `SELECT l.*, 
            u1.username as target_username, 
            u2.username as performed_by_username
          FROM user_management_logs l
          JOIN users u1 ON l.target_user_id = u1.id
          JOIN users u2 ON l.performed_by_user_id = u2.id
          WHERE l.target_user_id = $1
          ORDER BY l.created_at DESC
          LIMIT 100`
        : `SELECT l.*, 
            u1.username as target_username, 
            u2.username as performed_by_username
          FROM user_management_logs l
          JOIN users u1 ON l.target_user_id = u1.id
          JOIN users u2 ON l.performed_by_user_id = u2.id
          ORDER BY l.created_at DESC
          LIMIT 100`

    const result = await pool.query(query, userId ? [userId] : [])

    return result.rows
}
