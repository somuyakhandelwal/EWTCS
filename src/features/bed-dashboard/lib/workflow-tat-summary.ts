import type { DurationMetricSummary } from './stage-analytics'

export interface RawDurationMetricSummary {
  totalCycles: string
  averageDurationMs: string | null
  minDurationMs: string | null
  maxDurationMs: string | null
  medianDurationMs: string | null
  p90DurationMs: string | null
}

export function emptyDurationSummary(): DurationMetricSummary {
  return {
    totalCycles: 0,
    averageDurationMs: 0,
    minDurationMs: null,
    maxDurationMs: null,
    medianDurationMs: null,
    p90DurationMs: null,
  }
}

export function parseDurationSummary(row?: RawDurationMetricSummary): DurationMetricSummary {
  if (!row || row.totalCycles === '0') return emptyDurationSummary()

  return {
    totalCycles: parseInt(row.totalCycles, 10) || 0,
    averageDurationMs: parseFloat(row.averageDurationMs ?? '0') || 0,
    minDurationMs: row.minDurationMs !== null ? parseFloat(row.minDurationMs) : null,
    maxDurationMs: row.maxDurationMs !== null ? parseFloat(row.maxDurationMs) : null,
    medianDurationMs: row.medianDurationMs !== null ? parseFloat(row.medianDurationMs) : null,
    p90DurationMs: row.p90DurationMs !== null ? parseFloat(row.p90DurationMs) : null,
  }
}

export function appendDateFilters(
  sql: string,
  params: unknown[],
  column: string,
  startDate?: Date,
  endDate?: Date
): string {
  let nextSql = sql

  if (startDate) {
    params.push(startDate)
    nextSql += ` AND ${column} >= $${params.length}`
  }

  if (endDate) {
    params.push(endDate)
    nextSql += ` AND ${column} <= $${params.length}`
  }

  return nextSql
}
