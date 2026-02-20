// EPIC 13: Performance Monitoring — System Performance & Reliability
//
// Provides a lightweight wrapper to measure and log latency for server actions
// and service calls, and to detect SLA regressions at runtime.
//
// SLA targets (from acceptance criteria):
//   - Dashboard page:  p95 < 2 000 ms
//   - Reports page:    p95 < 3 000 ms

import { logger } from '@/shared/config/logger'

/** SLA thresholds in milliseconds */
export const PERF_SLA = {
  DASHBOARD_MS: 2_000,
  REPORTS_MS: 3_000,
} as const

/** Labels used in log output so monitoring tools can filter by label. */
export type PerfLabel = 'dashboard' | 'reports' | 'action' | 'query'

/** Result returned by `measurePerformance` alongside the original value. */
export interface PerfResult<T> {
  value: T
  durationMs: number
  withinSla: boolean
}

/**
 * Wraps an async operation, measures its wall-clock duration, and logs the
 * result at the appropriate level.
 *
 * Usage:
 * ```ts
 * const { value, durationMs } = await measurePerformance(
 *   () => getBedGridData(),
 *   'dashboard',
 *   PERF_SLA.DASHBOARD_MS,
 * )
 * ```
 *
 * @param fn          - Async operation to measure.
 * @param label       - Human-readable label for log output.
 * @param slaMs       - SLA threshold in milliseconds.  Breaches are logged at WARN.
 */
export async function measurePerformance<T>(
  fn: () => Promise<T>,
  label: string,
  slaMs: number,
): Promise<PerfResult<T>> {
  const start = Date.now()
  const value = await fn()
  const durationMs = Date.now() - start
  const withinSla = durationMs <= slaMs

  if (!withinSla) {
    logger.warn('SLA breach detected', {
      label,
      durationMs,
      slaMs,
      overageMs: durationMs - slaMs,
    })
  } else {
    logger.info('Performance measurement', { label, durationMs, slaMs, withinSla })
  }

  return { value, durationMs, withinSla }
}

/**
 * Returns a monotonic timestamp in milliseconds, suitable for latency measurement.
 * Use `perfStart()` / `perfEnd(start)` for manual instrumentation.
 */
export function perfStart(): number {
  return Date.now()
}

/**
 * Returns the elapsed milliseconds since the `startMs` captured by `perfStart`.
 */
export function perfEnd(startMs: number): number {
  return Date.now() - startMs
}

/**
 * Logs a named performance sample at INFO level.
 * Use for lightweight instrumentation where the full `measurePerformance`
 * wrapper is impractical (e.g. inside streaming routes).
 */
export function logPerf(
  label: string,
  durationMs: number,
  slaMs?: number,
): void {
  const withinSla = slaMs !== undefined ? durationMs <= slaMs : undefined
  logger.info('Perf sample', { label, durationMs, slaMs, withinSla })
}
