import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'

export type AuditorHistorySortBy =
  | 'transitionTime'
  | 'bedNumber'
  | 'toStageName'
  | 'changedByUsername'

export interface AuditorHistoryFilters {
  bedNumber?: string
  stageName?: string
  changedByUserId?: string
  changedByUsername?: string
  startDate?: Date
  endDate?: Date
}

export interface FetchAuditorHistoryOptions extends AuditorHistoryFilters {
  sortBy?: AuditorHistorySortBy
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export interface AuditorHistoryRecord {
  id: string
  bedId: string
  bedNumber: string
  fromStageName: string | null
  toStageName: string
  changedByUserId: string
  changedByUsername: string
  transitionTime: Date
  durationInPreviousStageMs: number | null
  notes: string | null
}

const SORT_COLUMN_MAP: Record<AuditorHistorySortBy, string> = {
  transitionTime: 'bsl.transition_time',
  bedNumber: 'b.bed_number',
  toStageName: 'ts.name',
  changedByUsername: 'u.username',
}

function buildWhereClause(filters: AuditorHistoryFilters): {
  whereSql: string
  params: unknown[]
} {
  const whereClauses: string[] = []
  const params: unknown[] = []

  if (filters.startDate) {
    params.push(filters.startDate)
    whereClauses.push(`bsl.transition_time >= $${params.length}`)
  }

  if (filters.endDate) {
    params.push(filters.endDate)
    whereClauses.push(`bsl.transition_time <= $${params.length}`)
  }

  if (filters.bedNumber?.trim()) {
    params.push(`%${filters.bedNumber.trim()}%`)
    whereClauses.push(`b.bed_number ILIKE $${params.length}`)
  }

  if (filters.stageName?.trim()) {
    params.push(`%${filters.stageName.trim()}%`)
    whereClauses.push(`ts.name ILIKE $${params.length}`)
  }

  if (filters.changedByUserId?.trim()) {
    params.push(filters.changedByUserId.trim())
    whereClauses.push(`u.id::text = $${params.length}`)
  }

  if (filters.changedByUsername?.trim()) {
    params.push(`%${filters.changedByUsername.trim()}%`)
    whereClauses.push(`u.username ILIKE $${params.length}`)
  }

  if (whereClauses.length === 0) {
    return { whereSql: '', params }
  }

  return { whereSql: `WHERE ${whereClauses.join(' AND ')}`, params }
}

export async function fetchAuditorHistory(options: FetchAuditorHistoryOptions): Promise<{
  rows: AuditorHistoryRecord[]
  totalCount: number
}> {
  try {
    const {
      sortBy = 'transitionTime',
      sortOrder = 'desc',
      limit = 50,
      offset = 0,
      ...filters
    } = options

    const safeSortBy = SORT_COLUMN_MAP[sortBy] ? sortBy : 'transitionTime'
    const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC'
    const safeLimit = Math.min(Math.max(limit, 1), 500)
    const safeOffset = Math.max(offset, 0)

    const { whereSql, params } = buildWhereClause(filters)

    const countResult = await query<{ totalCount: string }>(
      `
      SELECT COUNT(*)::text as "totalCount"
      FROM bed_stage_logs bsl
      JOIN beds b ON b.id = bsl.bed_id
      LEFT JOIN stages ts ON ts.id = bsl.to_stage_id
      JOIN users u ON u.id = bsl.changed_by_user_id
      ${whereSql}
      `,
      params
    )

    const listParams = [...params, safeLimit, safeOffset]

    const rowsResult = await query<AuditorHistoryRecord>(
      `
      SELECT
        bsl.id,
        b.id as "bedId",
        b.bed_number as "bedNumber",
        fs.name as "fromStageName",
        ts.name as "toStageName",
        bsl.changed_by_user_id as "changedByUserId",
        u.username as "changedByUsername",
        bsl.transition_time as "transitionTime",
        bsl.duration_in_previous_stage_ms as "durationInPreviousStageMs",
        bsl.notes
      FROM bed_stage_logs bsl
      JOIN beds b ON b.id = bsl.bed_id
      LEFT JOIN stages fs ON fs.id = bsl.from_stage_id
      LEFT JOIN stages ts ON ts.id = bsl.to_stage_id
      JOIN users u ON u.id = bsl.changed_by_user_id
      ${whereSql}
      ORDER BY ${SORT_COLUMN_MAP[safeSortBy]} ${safeSortOrder}
      LIMIT $${listParams.length - 1}
      OFFSET $${listParams.length}
      `,
      listParams
    )

    const totalCount = Number.parseInt(countResult.rows[0]?.totalCount ?? '0', 10)
    return {
      rows: rowsResult.rows,
      totalCount,
    }
  } catch (error) {
    logger.error('Failed to fetch auditor history', error as Error)
    throw new Error('Failed to fetch auditor history')
  }
}