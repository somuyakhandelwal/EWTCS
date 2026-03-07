import 'server-only'
// EPIC 14 — Data Retention & Archival
// US-14.1: Archive old bed_stage_logs entries to keep the active table fast
// US-14.2: Configurable retention policy

import pool from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'

export interface RetentionPolicy {
    id: string
    entity_type: string
    retain_months: number
    created_at: string
    updated_at: string
}

export interface ArchiveStats {
    activeRows: number
    archivedRows: number
    oldestActiveEntry: string | null
    oldestArchiveEntry: string | null
}

export async function getRetentionPolicies(): Promise<RetentionPolicy[]> {
    const { rows } = await pool.query(
        `SELECT * FROM data_retention_policies ORDER BY entity_type`
    )
    return rows as RetentionPolicy[]
}

export async function updateRetentionPolicy(entityType: string, retainMonths: number): Promise<void> {
    await pool.query(
        `UPDATE data_retention_policies SET retain_months = $1, updated_at = NOW() WHERE entity_type = $2`,
        [retainMonths, entityType]
    )
}

export async function getArchiveStats(): Promise<ArchiveStats> {
    const [activeRes, archivedRes] = await Promise.all([
        pool.query(`
            SELECT
                COUNT(*) AS total,
                MIN(transition_time) AS oldest
            FROM bed_stage_logs
        `),
        pool.query(`
            SELECT
                COUNT(*) AS total,
                MIN(transition_time) AS oldest
            FROM bed_stage_logs_archive
        `),
    ])
    return {
        activeRows: parseInt(activeRes.rows[0].total, 10),
        archivedRows: parseInt(archivedRes.rows[0].total, 10),
        oldestActiveEntry: activeRes.rows[0].oldest ?? null,
        oldestArchiveEntry: archivedRes.rows[0].oldest ?? null,
    }
}

export interface ArchiveResult {
    archivedCount: number
    cutoffDate: string
}

export async function archiveOldLogs(retainMonths: number): Promise<ArchiveResult> {
    const cutoffDate = new Date()
    cutoffDate.setMonth(cutoffDate.getMonth() - retainMonths)
    const cutoff = cutoffDate.toISOString()

    const client = await pool.connect()
    try {
        await client.query('BEGIN')

        // Insert old rows into archive
        const insertResult = await client.query(
            `INSERT INTO bed_stage_logs_archive
             SELECT * FROM bed_stage_logs
             WHERE transition_time < $1
             ON CONFLICT DO NOTHING`,
            [cutoff]
        )

        // Delete archived rows from active table
        await client.query(
            `DELETE FROM bed_stage_logs WHERE transition_time < $1`,
            [cutoff]
        )

        await client.query('COMMIT')
        logger.info(`Archived ${insertResult.rowCount} bed_stage_logs older than ${cutoff}`)
        return { archivedCount: insertResult.rowCount ?? 0, cutoffDate: cutoff }
    } catch (error) {
        await client.query('ROLLBACK')
        logger.error('Archival failed', error as Error)
        throw error
    } finally {
        client.release()
    }
}

// ---------------------------------------------------------------------------
// US-14.3: Retrieve Historical Data from archive
// ---------------------------------------------------------------------------

export interface ArchiveRow {
    id: string
    bedNumber: string
    wardName: string | null
    fromStage: string | null
    toStage: string | null
    transitionTime: string           // ISO string
    durationMs: number | null
    notes: string | null
}

export interface ArchiveFilter {
    startDate?: string    // 'YYYY-MM-DD'
    endDate?: string
    bedId?: string
    page?: number
    pageSize?: number
}

export interface ArchivePage {
    rows: ArchiveRow[]
    total: number
    page: number
    pageSize: number
}

export async function searchArchive(filter: ArchiveFilter): Promise<ArchivePage> {
    const page     = Math.max(1, filter.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 50))
    const offset   = (page - 1) * pageSize

    const conditions: string[] = []
    const params: unknown[]    = []

    if (filter.startDate) {
        params.push(filter.startDate)
        conditions.push(`bsa.transition_time >= $${params.length}::date`)
    }
    if (filter.endDate) {
        params.push(filter.endDate)
        conditions.push(`bsa.transition_time < ($${params.length}::date + interval '1 day')`)
    }
    if (filter.bedId) {
        params.push(filter.bedId)
        conditions.push(`bsa.bed_id = $${params.length}`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    // Count query
    const countResult = await pool.query<{ total: string }>(
        `SELECT COUNT(*) AS total FROM bed_stage_logs_archive bsa ${where}`,
        params
    )
    const total = parseInt(countResult.rows[0].total, 10)

    // Data query
    params.push(pageSize, offset)
    const dataResult = await pool.query<{
        id: string
        bed_number: string
        ward_name: string | null
        from_stage: string | null
        to_stage: string | null
        transition_time: Date
        duration_in_previous_stage_ms: string | null
        notes: string | null
    }>(
        `SELECT
            bsa.id,
            b.bed_number,
            b.ward_name,
            fs.name AS from_stage,
            ts.name AS to_stage,
            bsa.transition_time,
            bsa.duration_in_previous_stage_ms,
            bsa.notes
         FROM bed_stage_logs_archive bsa
         LEFT JOIN beds b  ON b.id  = bsa.bed_id
         LEFT JOIN stages fs ON fs.id = bsa.from_stage_id
         LEFT JOIN stages ts ON ts.id = bsa.to_stage_id
         ${where}
         ORDER BY bsa.transition_time DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
    )

    const rows: ArchiveRow[] = dataResult.rows.map((r) => ({
        id:             r.id,
        bedNumber:      r.bed_number,
        wardName:       r.ward_name,
        fromStage:      r.from_stage,
        toStage:        r.to_stage,
        transitionTime: new Date(r.transition_time).toISOString(),
        durationMs:     r.duration_in_previous_stage_ms
                            ? parseInt(r.duration_in_previous_stage_ms, 10)
                            : null,
        notes:          r.notes,
    }))

    return { rows, total, page, pageSize }
}

