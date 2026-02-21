import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import { STAGE_LOG_HISTORY_CTE } from './stage-log-history-source'

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
  transitionTime: 'sl.transition_time',
  bedNumber: 'sl.bed_number',
  toStageName: 'sl.to_stage_name',
  changedByUsername: 'sl.changed_by_username',
}

function buildWhereClause(filters: AuditorHistoryFilters): {
  whereSql: string
  params: unknown[]
} {
  const whereClauses: string[] = []
  const params: unknown[] = []

  if (filters.startDate) {
    params.push(filters.startDate)
    whereClauses.push(`sl.transition_time >= $${params.length}`)
  }

  if (filters.endDate) {
    params.push(filters.endDate)
    whereClauses.push(`sl.transition_time <= $${params.length}`)
  }

  if (filters.bedNumber?.trim()) {
    params.push(`%${filters.bedNumber.trim()}%`)
    whereClauses.push(`sl.bed_number ILIKE $${params.length}`)
  }

  if (filters.stageName?.trim()) {
    params.push(`%${filters.stageName.trim()}%`)
    whereClauses.push(`sl.to_stage_name ILIKE $${params.length}`)
  }

  if (filters.changedByUserId?.trim()) {
    params.push(filters.changedByUserId.trim())
    whereClauses.push(`sl.changed_by_user_id::text = $${params.length}`)
  }

  if (filters.changedByUsername?.trim()) {
    params.push(`%${filters.changedByUsername.trim()}%`)
    whereClauses.push(`sl.changed_by_username ILIKE $${params.length}`)
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
      ${STAGE_LOG_HISTORY_CTE}
      SELECT COUNT(*)::text as "totalCount"
      FROM stage_logs sl
      ${whereSql}
      `,
      params
    )

    const listParams = [...params, safeLimit, safeOffset]

    const rowsResult = await query<AuditorHistoryRecord>(
      `
      ${STAGE_LOG_HISTORY_CTE}
      SELECT
        sl.id,
        sl.bed_id as "bedId",
        sl.bed_number as "bedNumber",
        sl.from_stage_name as "fromStageName",
        sl.to_stage_name as "toStageName",
        sl.changed_by_user_id as "changedByUserId",
        sl.changed_by_username as "changedByUsername",
        sl.transition_time as "transitionTime",
        sl.duration_in_previous_stage_ms as "durationInPreviousStageMs",
        sl.notes
      FROM stage_logs sl
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