import type { DurationMetricSummary } from '../lib/stage-analytics'

const baseSummary: Omit<
  DurationMetricSummary,
  'totalCycles' | 'averageDurationMs'
> = {
  minDurationMs: 0,
  maxDurationMs: 0,
  medianDurationMs: 0,
  p90DurationMs: 0,
}

export const defaultWorkflowSummaries = {
  triage: createSummary(3, 930000),
  triageCleaning: createSummary(2, 420000),
  emergency: createSummary(5, 1800000),
  emergencyCleaning: createSummary(4, 600000),
}

export const emptyWorkflowSummary = createSummary(0, 0, {
  minDurationMs: null,
  maxDurationMs: null,
  medianDurationMs: null,
  p90DurationMs: null,
})

export function createSummary(
  totalCycles: number,
  averageDurationMs: number,
  overrides: Partial<DurationMetricSummary> = {}
): DurationMetricSummary {
  return {
    totalCycles,
    averageDurationMs,
    ...baseSummary,
    ...overrides,
  }
}

export function selectResult<T>(rows: T[]) {
  return {
    rows,
    rowCount: rows.length,
    command: 'SELECT',
    oid: 0,
    fields: [],
  }
}
