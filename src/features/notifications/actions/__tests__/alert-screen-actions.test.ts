import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/lib/auth', () => ({ requireRole: vi.fn() }))
vi.mock('@/shared/config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@/features/bed-dashboard/actions/bed-grid-actions', () => ({
  getBedGridData: vi.fn(),
}))
vi.mock('@/features/notifications/lib/alert-preferences-queries', () => ({
  readAlertPreferences: vi.fn(),
}))
vi.mock('@/lib/server/error-store', () => ({
  getRecentErrors: vi.fn(),
  acknowledgeError: vi.fn(),
}))

import { requireRole } from '@/shared/lib/auth'
import { getBedGridData } from '@/features/bed-dashboard/actions/bed-grid-actions'
import { readAlertPreferences } from '@/features/notifications/lib/alert-preferences-queries'
import { getRecentErrors } from '@/lib/server/error-store'
import { DEFAULT_ALERT_PREFERENCES } from '@/features/notifications/lib/default-alert-preferences'
import { getAlertScreenData } from '@/features/notifications/actions/alert-screen-actions'
import {
  SUPERVISOR_SESSION, DELAY_MS, ESCALATION_MS,
  makeBedGridData, SYSTEM_ERROR,
} from './alert-screen-fixtures'

const EMPTY_ERRORS: Awaited<ReturnType<typeof getRecentErrors>> = []

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('getAlertScreenData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION as never)
    vi.mocked(readAlertPreferences).mockResolvedValue(null)
    vi.mocked(getRecentErrors).mockResolvedValue(EMPTY_ERRORS)
  })

  it('returns empty alert list when no beds are delayed and no system errors', async () => {
    vi.mocked(getBedGridData).mockResolvedValue(makeBedGridData({ elapsedTimeMs: 0 }))

    const result = await getAlertScreenData()

    expect(result.success).toBe(true)
    expect(result.data?.alerts).toHaveLength(0)
    expect(result.data?.unacknowledgedCount).toBe(0)
  })

  it('returns a delayed_bed alert when elapsed time exceeds delay threshold', async () => {
    vi.mocked(getBedGridData).mockResolvedValue(makeBedGridData({ elapsedTimeMs: DELAY_MS }))

    const result = await getAlertScreenData()

    expect(result.success).toBe(true)
    const alerts = result.data?.alerts ?? []
    expect(alerts).toHaveLength(1)
    expect(alerts[0].kind).toBe('delayed_bed')
    expect(alerts[0].severity).toBe('delay')
  })

  it('returns an escalation alert (not delay) when elapsed time exceeds escalation threshold', async () => {
    vi.mocked(getBedGridData).mockResolvedValue(makeBedGridData({ elapsedTimeMs: ESCALATION_MS }))

    const result = await getAlertScreenData()

    const alerts = result.data?.alerts ?? []
    expect(alerts).toHaveLength(1)
    expect(alerts[0].kind).toBe('escalation')
    expect(alerts[0].severity).toBe('escalation')
  })

  it('returns a bottleneck alert for disposition bottleneck bed', async () => {
    // Set bottleneckCount threshold to 1 so a single bottleneck bed triggers
    vi.mocked(readAlertPreferences).mockResolvedValue({
      ...DEFAULT_ALERT_PREFERENCES,
      thresholds: { ...DEFAULT_ALERT_PREFERENCES.thresholds, bottleneckCount: 1 },
    })
    vi.mocked(getBedGridData).mockResolvedValue(
      makeBedGridData({ elapsedTimeMs: 0, isDispositionBottleneck: true, dispositionElapsedMs: 35 * 60 * 1000 })
    )

    const result = await getAlertScreenData()

    const bottlenecks = (result.data?.alerts ?? []).filter(a => a.kind === 'bottleneck')
    expect(bottlenecks).toHaveLength(1)
    expect(bottlenecks[0].severity).toBe('delay')
  })

  it('returns system_error alert for unacknowledged ERROR-level events', async () => {
    vi.mocked(getBedGridData).mockResolvedValue(makeBedGridData({ elapsedTimeMs: 0 }))
    vi.mocked(getRecentErrors).mockResolvedValue([SYSTEM_ERROR])

    const result = await getAlertScreenData()

    const errors = (result.data?.alerts ?? []).filter(a => a.kind === 'system_error')
    expect(errors).toHaveLength(1)
    expect(errors[0].severity).toBe('error')
  })

  it('does not return already-acknowledged system errors', async () => {
    vi.mocked(getBedGridData).mockResolvedValue(makeBedGridData({ elapsedTimeMs: 0 }))
    vi.mocked(getRecentErrors).mockResolvedValue([{ ...SYSTEM_ERROR, acknowledged: true }])

    const result = await getAlertScreenData()

    const errors = (result.data?.alerts ?? []).filter(a => a.kind === 'system_error')
    expect(errors).toHaveLength(0)
  })

  it('sorts critical errors before escalations before delays', async () => {
    vi.mocked(getBedGridData).mockResolvedValue(makeBedGridData({ elapsedTimeMs: DELAY_MS }))
    vi.mocked(getRecentErrors).mockResolvedValue([
      SYSTEM_ERROR,
      { ...SYSTEM_ERROR, id: 'err-crit', level: 'CRITICAL' as const },
    ])

    const result = await getAlertScreenData()

    const kinds = (result.data?.alerts ?? []).map(a => a.severity)
    // critical first, then error, then delay
    expect(kinds[0]).toBe('critical')
    expect(kinds[1]).toBe('error')
    expect(kinds[2]).toBe('delay')
  })

  it('returns error when requireRole throws', async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error('Unauthorized'))

    const result = await getAlertScreenData()

    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to load alert screen data')
  })

  it('returns error when getBedGridData fails', async () => {
    vi.mocked(getBedGridData).mockResolvedValue({ success: false, error: 'DB error' } as never)

    const result = await getAlertScreenData()

    expect(result.success).toBe(false)
    expect(result.error).toBe('DB error')
  })

  it('respects alert preferences — omits delayed beds when disabled', async () => {
    vi.mocked(readAlertPreferences).mockResolvedValue({
      ...DEFAULT_ALERT_PREFERENCES,
      enabledAlertTypes: { ...DEFAULT_ALERT_PREFERENCES.enabledAlertTypes, delayedBeds: false },
    })
    vi.mocked(getBedGridData).mockResolvedValue(makeBedGridData({ elapsedTimeMs: DELAY_MS }))

    const result = await getAlertScreenData()

    const delays = (result.data?.alerts ?? []).filter(a => a.kind === 'delayed_bed')
    expect(delays).toHaveLength(0)
  })

  it('respects alert preferences — omits system errors when disabled', async () => {
    vi.mocked(readAlertPreferences).mockResolvedValue({
      ...DEFAULT_ALERT_PREFERENCES,
      enabledAlertTypes: { ...DEFAULT_ALERT_PREFERENCES.enabledAlertTypes, systemErrors: false },
    })
    vi.mocked(getBedGridData).mockResolvedValue(makeBedGridData({ elapsedTimeMs: 0 }))
    vi.mocked(getRecentErrors).mockResolvedValue([SYSTEM_ERROR])

    const result = await getAlertScreenData()

    const errors = (result.data?.alerts ?? []).filter(a => a.kind === 'system_error')
    expect(errors).toHaveLength(0)
  })
})

// acknowledgeSystemAlert and getUnacknowledgedAlertCount tests are in alert-screen-ack-count.test.ts
