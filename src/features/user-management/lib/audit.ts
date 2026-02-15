import pool from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'

/**
 * Log user management action to audit trail
 * Epic 5: US-5.3 - User Management
 * US-5.3 Acceptance Criteria: "User management actions are logged"
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
    try {
        await pool.query(
            `INSERT INTO user_management_logs 
            (action_type, target_user_id, performed_by_user_id, changes, reason) 
            VALUES ($1, $2, $3, $4, $5)`,
            [actionType, targetUserId, performedById, JSON.stringify(changes || {}), reason]
        )
        
        logger.info(`User management action logged: ${actionType}`, {
            actionType,
            targetUserId,
            performedById,
        })
    } catch (error) {
        logger.error('Failed to log user management action', error as Error)
        throw error
    }
}
