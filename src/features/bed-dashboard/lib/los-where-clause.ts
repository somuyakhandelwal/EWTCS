// LoS WHERE clause builder — EPIC 10 internal helper
// Builds parameterised SQL WHERE fragment for date + shift filters.
// BUG FIX #6: uses AT TIME ZONE to compare local hospital time, not UTC.

import type { LosFilters } from './los-types'

export function buildLosWhereClause(filters: LosFilters): {
  whereSql: string
  params: unknown[]
} {
  const clauses: string[] = []
  const params: unknown[] = []

  if (filters.startDate) {
    params.push(filters.startDate)
    clauses.push(`pa.discharged_at >= $${params.length}`)
  }

  if (filters.endDate) {
    params.push(filters.endDate)
    clauses.push(`pa.discharged_at <= $${params.length}`)
  }

  if (filters.shiftStartTime && filters.shiftEndTime) {
    const tz = process.env.HOSPITAL_TIMEZONE ?? 'Asia/Kolkata'
    params.push(filters.shiftStartTime, filters.shiftEndTime, tz)
    const tCol = `(pa.discharged_at AT TIME ZONE $${params.length})::time`
    const startP = `$${params.length - 2}::time`
    const endP = `$${params.length - 1}::time`

    if (!filters.shiftCrossesMidnight) {
      clauses.push(`(${tCol} >= ${startP} AND ${tCol} < ${endP})`)
    } else {
      clauses.push(`(${tCol} >= ${startP} OR ${tCol} < ${endP})`)
    }
  }

  const whereSql = clauses.length > 0 ? 'WHERE ' + clauses.join(' AND ') : ''
  return { whereSql, params }
}
