import type { AuditorHistorySortBy } from '../lib/auditor-history-queries'

export const AUDITOR_HISTORY_PAGE_SIZE = 25

export type AuditorHistoryFilters = {
  bedNumber: string
  stageName: string
  changedByUserId: string
  changedByUsername: string
  startDate: string
  endDate: string
}

export const DEFAULT_AUDITOR_HISTORY_FILTERS: AuditorHistoryFilters = {
  bedNumber: '',
  stageName: '',
  changedByUserId: '',
  changedByUsername: '',
  startDate: '',
  endDate: '',
}

export function buildAuditorHistoryPayload(params: {
  filters: AuditorHistoryFilters
  sortBy: AuditorHistorySortBy
  sortOrder: 'asc' | 'desc'
  page: number
}) {
  const { filters, sortBy, sortOrder, page } = params

  return {
    bedNumber: filters.bedNumber || undefined,
    stageName: filters.stageName || undefined,
    changedByUserId: filters.changedByUserId || undefined,
    changedByUsername: filters.changedByUsername || undefined,
    startDate: filters.startDate ? new Date(filters.startDate) : undefined,
    endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    sortBy,
    sortOrder,
    limit: AUDITOR_HISTORY_PAGE_SIZE,
    offset: (page - 1) * AUDITOR_HISTORY_PAGE_SIZE,
  }
}