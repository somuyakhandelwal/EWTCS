import 'server-only'
// EPIC 13 — Performance & Reliability
// US-13.8: System Health Dashboard — pool status, DB connections, migration state

import pool from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'

export interface PoolStats {
    total: number
    idle: number
    waiting: number
    max: number
    utilizationPct: number
}

export interface DbStats {
    activeConnections: number
    idleConnections: number
    waitingConnections: number
    databaseName: string
    serverVersion: string
    dbSizeBytes: bigint | null
    dbSizeMb: string
    transactionsCommitted: bigint | null
    transactionsRolledBack: bigint | null
}

export interface MigrationStats {
    applied: number
    lastMigration: string | null
    lastAppliedAt: string | null
}

export interface UserStats {
    totalUsers: number
    activeUsers: number
    admins: number
    supervisors: number
    nurses: number
}

export interface HealthData {
    pool: PoolStats
    db: DbStats
    migrations: MigrationStats
    users: UserStats
    checkedAt: string
}

export async function getHealthData(): Promise<HealthData> {
    const checkedAt = new Date().toISOString()

    // Pool stats are synchronous — no query needed
    const poolStats: PoolStats = {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
        max: 50,
        utilizationPct: pool.totalCount > 0
            ? Math.round(((pool.totalCount - pool.idleCount) / 50) * 100)
            : 0,
    }

    try {
        const [dbResult, migrationsResult, usersResult] = await Promise.all([
            pool.query(`
                SELECT
                    current_database() AS db_name,
                    version()          AS server_version,
                    pg_database_size(current_database()) AS db_size_bytes,
                    (SELECT count(*) FROM pg_stat_activity WHERE state = 'active')  AS active_conn,
                    (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle')    AS idle_conn,
                    (SELECT count(*) FROM pg_stat_activity WHERE wait_event_type = 'Lock') AS waiting_conn,
                    (SELECT xact_commit    FROM pg_stat_database WHERE datname = current_database()) AS xact_commit,
                    (SELECT xact_rollback  FROM pg_stat_database WHERE datname = current_database()) AS xact_rollback
            `),
            pool.query(`
                SELECT name, applied_at
                FROM migrations
                ORDER BY applied_at DESC
                LIMIT 1
            `).catch(() => ({ rows: [] as { name: string; applied_at: string }[] })),
            pool.query(`
                SELECT
                    COUNT(*)                                          AS total,
                    COUNT(*) FILTER (WHERE is_active = true)         AS active,
                    COUNT(*) FILTER (WHERE role = 'admin')           AS admins,
                    COUNT(*) FILTER (WHERE role = 'supervisor')      AS supervisors,
                    COUNT(*) FILTER (WHERE role = 'nurse')           AS nurses
                FROM users
            `),
        ])

        const d = dbResult.rows[0]
        const m = (migrationsResult.rows as { name: string; applied_at: string }[])[0]
        const u = usersResult.rows[0]

        // Count applied migrations by listing files — fall back gracefully
        let appliedCount = 0
        try {
            const countRes = await pool.query(`SELECT COUNT(*) AS cnt FROM migrations`)
            appliedCount = parseInt(countRes.rows[0].cnt, 10)
        } catch {
            // migrations table might not track count
        }

        return {
            pool: poolStats,
            db: {
                activeConnections: parseInt(d.active_conn, 10),
                idleConnections: parseInt(d.idle_conn, 10),
                waitingConnections: parseInt(d.waiting_conn, 10),
                databaseName: d.db_name,
                serverVersion: d.server_version?.split(' ').slice(0, 2).join(' ') ?? 'Unknown',
                dbSizeBytes: d.db_size_bytes,
                dbSizeMb: d.db_size_bytes
                    ? (Number(d.db_size_bytes) / 1024 / 1024).toFixed(1) + ' MB'
                    : 'Unknown',
                transactionsCommitted: d.xact_commit,
                transactionsRolledBack: d.xact_rollback,
            },
            migrations: {
                applied: appliedCount,
                lastMigration: m?.name ?? null,
                lastAppliedAt: m?.applied_at ?? null,
            },
            users: {
                totalUsers: parseInt(u.total, 10),
                activeUsers: parseInt(u.active, 10),
                admins: parseInt(u.admins, 10),
                supervisors: parseInt(u.supervisors, 10),
                nurses: parseInt(u.nurses, 10),
            },
            checkedAt,
        }
    } catch (error) {
        logger.error('Failed to fetch health data', error as Error)
        return {
            pool: poolStats,
            db: {
                activeConnections: 0,
                idleConnections: 0,
                waitingConnections: 0,
                databaseName: 'Unknown',
                serverVersion: 'Unknown',
                dbSizeBytes: null,
                dbSizeMb: 'Unknown',
                transactionsCommitted: null,
                transactionsRolledBack: null,
            },
            migrations: { applied: 0, lastMigration: null, lastAppliedAt: null },
            users: { totalUsers: 0, activeUsers: 0, admins: 0, supervisors: 0, nurses: 0 },
            checkedAt,
        }
    }
}
