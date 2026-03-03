import 'server-only'
import pool from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import { headers } from 'next/headers'
import { getClientIpFromHeaders } from '@/shared/lib/request-ip'

/** Used when entity_id cannot be represented as a UUID (e.g. key-value system settings). */
const NIL_UUID = '00000000-0000-0000-0000-000000000000'
const UUID_RE  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Coerces `entityId` to a valid UUID.
 * If it is not already a UUID, returns the nil UUID and records the original
 * value in the returned metadata so traceability is not lost.
 */
function resolveEntityId(
    entityId: string,
    metadata: Record<string, unknown>,
): { entityId: string; metadata: Record<string, unknown> } {
    if (UUID_RE.test(entityId)) return { entityId, metadata }
    return {
        entityId: NIL_UUID,
        metadata: { ...metadata, _entityRef: entityId },
    }
}

/**
 * Generic audit logging system for all features
 * Use this for tracking any entity changes (users, beds, patients, etc.)
 */export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'ACTIVATE' | 'DEACTIVATE' | 'LOGIN' | 'LOGOUT' | string

export interface AuditLogEntry {
    /** Type of action performed */
    actionType: AuditAction
    /** Entity type (e.g., 'user', 'bed', 'patient') */
    entityType: string
    /** ID of the entity being acted upon */
    entityId: string
    /** ID of the user performing the action */
    performedBy: string
    /** Object containing what was changed */
    changes?: Record<string, unknown>
    /** Optional reason for the action */
    reason?: string
    /** Optional metadata for additional context */
    metadata?: Record<string, unknown>
    /** Optional client IP address */
    ipAddress?: string | null
}

export interface AuditLogRecord {
    id: string
    action_type: string
    entity_type: string
    entity_id: string
    performed_by_user_id: string
    changes: Record<string, unknown>
    reason: string | null
    metadata: Record<string, unknown>
    ip_address: string | null
    created_at: string
    performed_by_username?: string | null
    performed_by_role?: string | null
    // Legacy field for backward compatibility with old user_management_logs
    target_user_id?: string | null
    target_username?: string | null
}

/** Log any entity action to the audit trail. Non-UUID entityId values are
 *  coerced to the nil UUID; the original string is stored in metadata._entityRef. */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
    try {
        let resolvedIpAddress = entry.ipAddress || null

        if (!resolvedIpAddress) {
            try {
                const requestHeaders = await headers()
                resolvedIpAddress = getClientIpFromHeaders(requestHeaders)
            } catch {
                resolvedIpAddress = null
            }
        }

        // entity_id column is UUID — coerce non-UUID values to nil UUID.
        const { entityId, metadata } = resolveEntityId(entry.entityId, entry.metadata ?? {})

        await pool.query(
            `INSERT INTO audit_logs 
            (action_type, entity_type, entity_id, performed_by_user_id, changes, reason, metadata, ip_address) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                entry.actionType,
                entry.entityType,
                entityId,
                entry.performedBy,
                JSON.stringify(entry.changes || {}),
                entry.reason || null,
                JSON.stringify(metadata),
                resolvedIpAddress,
            ]
        )

        logger.info(`Audit log created: ${entry.actionType} ${entry.entityType}`, {
            actionType: entry.actionType,
            entityType: entry.entityType,
            entityId: entry.entityId,
            performedBy: entry.performedBy,
        })
    } catch (error) {
        logger.error('Failed to create audit log', error as Error)
        throw error
    }
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

