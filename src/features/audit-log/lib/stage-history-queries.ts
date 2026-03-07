import 'server-only'
// EPIC 12 — Audit Logs & Compliance
// US-12.2: Filterable, paginated, exportable stage change history

import pool from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'

export interface StageHistoryRow {
    id: string
    bed_number: string
    bed_id: string
    ward_name: string
    from_stage: string | null
    to_stage: string
    transition_time: string
    duration_prev_ms: number | null
    changed_by_username: string | null
    changed_by_role: string | null
    notes: string | null
    shift_name: string | null
}

export interface StageHistoryFilter {
    bedId?: string
    stageId?: string
    userId?: string
    startDate?: string
    endDate?: string
    page?: number
    pageSize?: number
}

export interface StageHistoryPage {
    rows: StageHistoryRow[]
    total: number
    page: number
    pageSize: number
}

export async function getStageHistoryPage(filter: StageHistoryFilter = {}): Promise<StageHistoryPage> {
    const {
        bedId,
        stageId,
        userId,
        startDate,
        endDate,
        page = 1,
        pageSize = 50,
    } = filter

    const conditions: string[] = []
    const params: (string | number)[] = []
    let idx = 1

    if (bedId) { conditions.push(`bsl.bed_id = $${idx++}`); params.push(bedId) }
    if (stageId) { conditions.push(`(bsl.to_stage_id = $${idx++} OR bsl.from_stage_id = $${idx - 1})`); params.push(stageId) }
    if (userId) { conditions.push(`bsl.changed_by_user_id = $${idx++}`); params.push(userId) }
    if (startDate) { conditions.push(`bsl.transition_time >= $${idx++}`); params.push(startDate) }
    if (endDate) { conditions.push(`bsl.transition_time <= $${idx++}`); params.push(endDate + ' 23:59:59') }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const offset = (page - 1) * pageSize
    const dataParams = [...params, pageSize, offset]

    try {
        const [dataResult, countResult] = await Promise.all([
            pool.query(
                `SELECT
                    bsl.id,
                    b.bed_number,
                    b.id AS bed_id,
                    COALESCE(b.ward_name, 'Unknown') AS ward_name,
                    fs.name AS from_stage,
                    ts.name AS to_stage,
                    bsl.transition_time,
                    bsl.duration_in_previous_stage_ms AS duration_prev_ms,
                    u.username AS changed_by_username,
                    u.role AS changed_by_role,
                    bsl.notes,
                    sh.name AS shift_name
                FROM bed_stage_logs bsl
                JOIN beds b ON bsl.bed_id = b.id
                LEFT JOIN stages fs ON bsl.from_stage_id = fs.id
                JOIN stages ts ON bsl.to_stage_id = ts.id
                LEFT JOIN users u ON bsl.changed_by_user_id = u.id
                LEFT JOIN shifts sh ON bsl.shift_id = sh.id
                ${where}
                ORDER BY bsl.transition_time DESC
                LIMIT $${idx} OFFSET $${idx + 1}`,
                dataParams
            ),
            pool.query(
                `SELECT COUNT(*) AS total FROM bed_stage_logs bsl ${where}`,
                params
            ),
        ])

        return {
            rows: dataResult.rows as StageHistoryRow[],
            total: parseInt(countResult.rows[0].total, 10),
            page,
            pageSize,
        }
    } catch (error) {
        logger.error('Failed to fetch stage history page', error as Error)
        throw error
    }
}

export interface BedOption { id: string; bed_number: string }
export interface StageOption { id: string; name: string }

export async function getBedAndStageOptions(): Promise<{ beds: BedOption[]; stages: StageOption[] }> {
    const [bedsRes, stagesRes] = await Promise.all([
        pool.query(`SELECT id, bed_number FROM beds ORDER BY bed_number`),
        pool.query(`SELECT id, name FROM stages ORDER BY name`),
    ])
    return {
        beds: bedsRes.rows as BedOption[],
        stages: stagesRes.rows as StageOption[],
    }
}
