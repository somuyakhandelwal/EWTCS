import 'server-only'
// US-14.3: Search and paginate over archived bed stage log records

import pool from '@/shared/lib/db'

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

    const countResult = await pool.query<{ total: string }>(
        `SELECT COUNT(*) AS total FROM bed_stage_logs_archive bsa ${where}`,
        params
    )
    const total = parseInt(countResult.rows[0].total, 10)

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
