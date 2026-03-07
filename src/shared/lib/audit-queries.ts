import 'server-only'
import pool from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { AuditLogRecord } from './audit'

/**
 * Flexible paginated audit log query for the admin viewer
 * Supports filtering by entity_type, action_type, performed_by_user_id, and date range
 */
export interface AuditLogFilter {
    entityType?: string
    actionType?: string
    userId?: string
    startDate?: string
    endDate?: string
    page?: number
    pageSize?: number
}

export interface AuditLogPage {
    rows: AuditLogRecord[]
    total: number
    page: number
    pageSize: number
}

/**
 * Get audit logs for a specific entity
 * @param entityType - Type of entity ('user', 'bed', etc.)
 * @param entityId - Optional ID to filter by specific entity
 * @param limit - Maximum number of logs to return (default: 100)
 */
export async function getAuditLogs(
    entityType: string,
    entityId?: string,
    limit = 100
): Promise<AuditLogRecord[]> {
    try {
        let query = `
            SELECT 
                al.*,
                u.username as performed_by_username,
                u.role as performed_by_role
            FROM audit_logs al
            LEFT JOIN users u ON al.performed_by_user_id = u.id
            WHERE al.entity_type = $1
        `
        const params: (string | number)[] = [entityType]

        if (entityId) {
            query += ` AND al.entity_id = $2`
            params.push(entityId)
            query += ` ORDER BY al.created_at DESC LIMIT $3`
            params.push(limit)
        } else {
            query += ` ORDER BY al.created_at DESC LIMIT $2`
            params.push(limit)
        }

        const { rows } = await pool.query(query, params)
        return rows as AuditLogRecord[]
    } catch (error) {
        logger.error('Failed to fetch audit logs', error as Error)
        throw error
    }
}

export async function getAuditLogPage(filter: AuditLogFilter = {}): Promise<AuditLogPage> {
    const {
        entityType,
        actionType,
        userId,
        startDate,
        endDate,
        page = 1,
        pageSize = 50,
    } = filter

    const conditions: string[] = []
    const params: (string | number)[] = []
    let idx = 1

    if (entityType) { conditions.push(`al.entity_type = $${idx++}`); params.push(entityType) }
    if (actionType) { conditions.push(`al.action_type = $${idx++}`); params.push(actionType) }
    if (userId) { conditions.push(`al.performed_by_user_id = $${idx++}`); params.push(userId) }
    if (startDate) { conditions.push(`al.created_at >= $${idx++}`); params.push(startDate) }
    if (endDate) { conditions.push(`al.created_at <= $${idx++}`); params.push(endDate + ' 23:59:59') }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const offset = (page - 1) * pageSize
    const dataParams = [...params, pageSize, offset]

    try {
        const [dataResult, countResult] = await Promise.all([
            pool.query(
                `SELECT al.*, u.username as performed_by_username, u.role as performed_by_role
                 FROM audit_logs al
                 LEFT JOIN users u ON al.performed_by_user_id = u.id
                 ${where}
                 ORDER BY al.created_at DESC
                 LIMIT $${idx} OFFSET $${idx + 1}`,
                dataParams
            ),
            pool.query(
                `SELECT COUNT(*) AS total FROM audit_logs al ${where}`,
                params
            ),
        ])
        return {
            rows: dataResult.rows as AuditLogRecord[],
            total: parseInt(countResult.rows[0].total, 10),
            page,
            pageSize,
        }
    } catch (error) {
        logger.error('Failed to fetch audit log page', error as Error)
        throw error
    }
}

/**
 * Get distinct entity types that appear in audit_logs (for filter dropdown)
 */
export async function getAuditEntityTypes(): Promise<string[]> {
    try {
        const { rows } = await pool.query(
            `SELECT DISTINCT entity_type FROM audit_logs ORDER BY entity_type`
        )
        return rows.map((r: { entity_type: string }) => r.entity_type)
    } catch (error) {
        logger.error('Failed to fetch audit entity types', error as Error)
        throw error
    }
}

/**
 * Get recent audit logs across all entity types
 * @param limit - Maximum number of logs to return (default: 50)
 */
export async function getRecentAuditLogs(limit = 50): Promise<AuditLogRecord[]> {
    try {
        const { rows } = await pool.query(
            `SELECT 
                al.*,
                u.username as performed_by_username,
                u.role as performed_by_role
            FROM audit_logs al
            LEFT JOIN users u ON al.performed_by_user_id = u.id
            ORDER BY al.created_at DESC
            LIMIT $1`,
            [limit]
        )
        return rows as AuditLogRecord[]
    } catch (error) {
        logger.error('Failed to fetch recent audit logs', error as Error)
        throw error
    }
}
