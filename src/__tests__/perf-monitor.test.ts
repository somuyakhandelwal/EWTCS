// EPIC 13: Performance Monitor Unit Tests
// Verifies that the perf-monitor utilities correctly measure, classify,
// and log latency samples against the Dashboard/Reports SLA targets.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { measurePerformance, perfStart, perfEnd, logPerf, PERF_SLA } from '@/shared/lib/perf-monitor'
import { logger } from '@/shared/config/logger'

vi.mock('@/shared/config/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

const mockedWarn = vi.mocked(logger.warn)
const mockedInfo = vi.mocked(logger.info)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PERF_SLA constants', () => {
  it('defines Dashboard SLA as 2 000 ms', () => {
    expect(PERF_SLA.DASHBOARD_MS).toBe(2_000)
  })

  it('defines Reports SLA as 3 000 ms', () => {
    expect(PERF_SLA.REPORTS_MS).toBe(3_000)
  })
})

describe('measurePerformance', () => {
  it('returns the resolved value from the wrapped function', async () => {
    const { value } = await measurePerformance(
      async () => 'test-result',
      'dashboard',
      PERF_SLA.DASHBOARD_MS,
    )
    expect(value).toBe('test-result')
  })

  it('reports withinSla=true for a fast operation', async () => {
    const { withinSla } = await measurePerformance(
      async () => null,
      'fast-op',
      PERF_SLA.DASHBOARD_MS,
    )
    expect(withinSla).toBe(true)
  })

  it('reports withinSla=false and logs a WARN when the SLA is breached', async () => {
    // Simulate a 3 000 ms operation against the 2 000 ms Dashboard SLA.
    const dateNow = vi.spyOn(Date, 'now')
    dateNow.mockReturnValueOnce(0).mockReturnValueOnce(3_000)

    const { withinSla, durationMs } = await measurePerformance(
      async () => { /* intentionally empty */ },
      'slow-op',
      PERF_SLA.DASHBOARD_MS,
    )
    expect(withinSla).toBe(false)
    expect(durationMs).toBe(3_000)
    expect(mockedWarn).toHaveBeenCalledWith(
      'SLA breach detected',
      expect.objectContaining({ label: 'slow-op', slaMs: PERF_SLA.DASHBOARD_MS }),
    )

    dateNow.mockRestore()
  })

  it('logs INFO (not WARN) when the SLA is met', async () => {
    await measurePerformance(async () => null, 'ok-op', PERF_SLA.DASHBOARD_MS)
    expect(mockedWarn).not.toHaveBeenCalled()
    expect(mockedInfo).toHaveBeenCalledWith(
      'Performance measurement',
      expect.objectContaining({ label: 'ok-op', withinSla: true }),
    )
  })
})

describe('perfStart / perfEnd', () => {
  it('returns elapsed milliseconds >= 0', () => {
    const start = perfStart()
    const elapsed = perfEnd(start)
    expect(elapsed).toBeGreaterThanOrEqual(0)
  })
})

describe('logPerf', () => {
  it('logs a performance sample at INFO level', () => {
    logPerf('reports', 1200, PERF_SLA.REPORTS_MS)
    expect(mockedInfo).toHaveBeenCalledWith(
      'Perf sample',
      expect.objectContaining({ label: 'reports', durationMs: 1200, withinSla: true }),
    )
  })

  it('marks withinSla as undefined when no SLA threshold is provided', () => {
    logPerf('unnamed', 500)
    expect(mockedInfo).toHaveBeenCalledWith(
      'Perf sample',
      expect.objectContaining({ withinSla: undefined }),
    )
  })
})
