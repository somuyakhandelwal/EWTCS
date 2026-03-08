import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────────────────────

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
import { getRecentErrors, acknowledgeError } from '@/lib/server/error-store'
import type { ErrorEvent } from '@/lib/server/error-store'
import { DEFAULT_ALERT_PREFERENCES } from '@/features/notifications/lib/default-alert-preferences'
import {
  getAlertScreenData,
  acknowledgeSystemAlert,
  getUnacknowledgedAlertCount,
} from '@/features/notifications/actions/alert-screen-actions'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SUPERVISOR_SESSION = { userId: 'sup-1', role: 'supervisor' }

const DELAY_MS = DEFAULT_ALERT_PREFERENCES.thresholds.delayMinutes * 60 * 1000 + 1000
const ESCALATION_MS = DEFAULT_ALERT_PREFERENCES.thresholds.escalationMinutes * 60 * 1000 + 1000

function makeBedGridData(override: Partial<{
  elapsedTimeMs: number | null
  isDispositionBottleneck: boolean
  dispositionElapsedMs: number | null
  isEscalated: boolean
}> = {}) {
  const now = new Date()
  return {
    success: true,
    data: {
      beds: [
        {
          id: 'bed-1',
          bedNumber: 'ER-01',
          currentStage: { id: 's1', name: 'Triage', displayOrder: 1, colorCode: '#fff', description: null, isActive: true, createdAt: now, updatedAt: now },
          currentStageId: 's1',
          elapsedTimeMs: override.elapsedTimeMs ?? 0,
          isDelayed: (override.elapsedTimeMs ?? 0) > 0,
          isEscalated: override.isEscalated ?? false,
          isDispositionBottleneck: override.isDispositionBottleneck ?? false,
          dispositionElapsedMs: override.dispositionElapsedMs ?? null,
          dispositionDelayReason: null,
          dispositionDelayLogId: null,
          patientStartTime: now,
          lastStageChange: now,
          isOccupied: true,
          isActive: true,
          isTemporary: false,
          isVirtual: false,
          wardId: null,
          metadata: {},
          createdAt: now,
          updatedAt: now,
        },
      ],
      stages: [],
      delayThresholdMs: DEFAULT_ALERT_PREFERENCES.thresholds.delayMinutes * 60 * 1000,
      escalationThresholdMs: DEFAULT_ALERT_PREFERENCES.thresholds.escalationMinutes * 60 * 1000,
      bottleneckCount: 0,
      escalationCount: 0,
    },
    error: undefined,
  } as unknown as Awaited<ReturnType<typeof getBedGridData>>
}

const EMPTY_ERRORS: Awaited<ReturnType<typeof getRecentErrors>> = []

const SYSTEM_ERROR: ErrorEvent = {
  id: 'err-1',
  level: 'ERROR',
  category: 'database',
  message: 'Connection pool exhausted',
  stack: undefined,
  context: {},
  acknowledged: false,
  created_at: new Date().toISOString(),
}

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

describe('acknowledgeSystemAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION as never)
  })

  it('acknowledges a valid error event', async () => {
    vi.mocked(acknowledgeError).mockResolvedValue(true)

    const result = await acknowledgeSystemAlert('err-1')

    expect(result.success).toBe(true)
    expect(acknowledgeError).toHaveBeenCalledWith('err-1')
  })

  it('returns error if event not found', async () => {
    vi.mocked(acknowledgeError).mockResolvedValue(false)

    const result = await acknowledgeSystemAlert('missing-id')

    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('blocks unauthorized callers', async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error('Unauthorized'))

    const result = await acknowledgeSystemAlert('err-1')

    expect(result.success).toBe(false)
  })
})

describe('getUnacknowledgedAlertCount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION as never)
    vi.mocked(readAlertPreferences).mockResolvedValue(null)
    vi.mocked(getRecentErrors).mockResolvedValue(EMPTY_ERRORS)
  })

  it('returns 0 when no alerts', async () => {
    vi.mocked(getBedGridData).mockResolvedValue(makeBedGridData({ elapsedTimeMs: 0 }))

    const result = await getUnacknowledgedAlertCount()

    expect(result.success).toBe(true)
    expect(result.count).toBe(0)
  })

  it('counts delayed beds + system errors', async () => {
    vi.mocked(getBedGridData).mockResolvedValue(makeBedGridData({ elapsedTimeMs: DELAY_MS }))
    vi.mocked(getRecentErrors).mockResolvedValue([SYSTEM_ERROR])

    const result = await getUnacknowledgedAlertCount()

    expect(result.success).toBe(true)
    expect(result.count).toBe(2) // 1 bed + 1 error
  })
})
