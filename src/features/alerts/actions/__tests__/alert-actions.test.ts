// Alert Server Actions Tests — getAlertsAction
// EPIC 15: Notifications & Alerts (US-15.4)

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/lib/auth', () => ({ requireRole: vi.fn() }))
vi.mock('@/shared/lib/audit', () => ({ logAudit: vi.fn() }))
vi.mock('@/shared/config/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))
vi.mock('@/features/alerts/lib/alert-queries', () => ({
  getActiveAlerts: vi.fn(),
}))
vi.mock('@/features/alerts/lib/alert-mutations', () => ({
  upsertAcknowledgment: vi.fn(),
}))
vi.mock('@/features/notifications/lib/notification-preference-queries', () => ({
  getUserPreferenceMap: vi.fn(),
}))

import { requireRole } from '@/shared/lib/auth'
import { getActiveAlerts } from '@/features/alerts/lib/alert-queries'
import { getUserPreferenceMap } from '@/features/notifications/lib/notification-preference-queries'
import { getAlertsAction } from '../alert-actions'
import type { Alert } from '../../types/alert'

const SUPERVISOR_SESSION = { userId: 'sup-1', username: 'supervisor1', role: 'supervisor' }

const makeAlert = (overrides: Partial<Alert> = {}): Alert => ({
  id: 'delayed_bed:bed-1',
  type: 'delayed_bed',
  severity: 'warning',
  title: 'Bed ER-01 — Extended Wait',
  description: 'Patient waiting 4h',
  bedId: 'bed-1',
  bedNumber: 'ER-01',
  elapsedTimeMs: 14_400_000,
  isAcknowledged: false,
  acknowledgedAt: null,
  acknowledgedBy: null,
  acknowledgedUntil: null,
  startedAt: new Date('2026-03-07T06:00:00Z'),
  ...overrides,
})

describe('getAlertsAction', () => {
  beforeEach(() => vi.clearAllMocks())

  it('blocks non-supervisor roles', async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error('Unauthorized'))

    const result = await getAlertsAction()

    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('returns all alerts when all preference types are enabled', async () => {
    vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION as never)
    vi.mocked(getActiveAlerts).mockResolvedValue([makeAlert()])
    vi.mocked(getUserPreferenceMap).mockResolvedValue({
      delayed_bed:            { enabled: true, minDelayThresholdMinutes: null },
      disposition_bottleneck: { enabled: true, minDelayThresholdMinutes: null },
      system_error:           { enabled: true, minDelayThresholdMinutes: null },
    })

    const result = await getAlertsAction()

    expect(result.success).toBe(true)
    expect(result.alerts).toHaveLength(1)
    expect(result.alerts![0].type).toBe('delayed_bed')
  })

  it('filters out alerts for disabled preference types', async () => {
    vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION as never)
    vi.mocked(getActiveAlerts).mockResolvedValue([makeAlert()])
    vi.mocked(getUserPreferenceMap).mockResolvedValue({
      delayed_bed:            { enabled: false, minDelayThresholdMinutes: null },
      disposition_bottleneck: { enabled: true,  minDelayThresholdMinutes: null },
      system_error:           { enabled: true,  minDelayThresholdMinutes: null },
    })

    const result = await getAlertsAction()

    expect(result.success).toBe(true)
    expect(result.alerts).toHaveLength(0)
  })

  it('filters out alerts below a custom minDelayThresholdMinutes override', async () => {
    const alert = makeAlert({ elapsedTimeMs: 60_000 }) // 1 minute
    vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION as never)
    vi.mocked(getActiveAlerts).mockResolvedValue([alert])
    vi.mocked(getUserPreferenceMap).mockResolvedValue({
      delayed_bed:            { enabled: true, minDelayThresholdMinutes: 30 }, // 30 min min
      disposition_bottleneck: { enabled: true, minDelayThresholdMinutes: null },
      system_error:           { enabled: true, minDelayThresholdMinutes: null },
    })

    const result = await getAlertsAction()

    expect(result.success).toBe(true)
    expect(result.alerts).toHaveLength(0)
  })

  it('returns system_error alerts when enabled', async () => {
    const sysAlert = makeAlert({
      id: 'system_error:err-1',
      type: 'system_error',
      severity: 'critical',
      bedId: null,
      bedNumber: 'database',
      title: 'System Error — database',
      description: 'Connection pool exhausted',
    })
    vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION as never)
    vi.mocked(getActiveAlerts).mockResolvedValue([sysAlert])
    vi.mocked(getUserPreferenceMap).mockResolvedValue({
      delayed_bed:            { enabled: true, minDelayThresholdMinutes: null },
      disposition_bottleneck: { enabled: true, minDelayThresholdMinutes: null },
      system_error:           { enabled: true, minDelayThresholdMinutes: null },
    })

    const result = await getAlertsAction()

    expect(result.success).toBe(true)
    expect(result.alerts).toHaveLength(1)
    expect(result.alerts![0].type).toBe('system_error')
  })

  it('returns error when query throws', async () => {
    vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION as never)
    vi.mocked(getActiveAlerts).mockRejectedValue(new Error('DB unavailable'))
    vi.mocked(getUserPreferenceMap).mockResolvedValue({
      delayed_bed:            { enabled: true, minDelayThresholdMinutes: null },
      disposition_bottleneck: { enabled: true, minDelayThresholdMinutes: null },
      system_error:           { enabled: true, minDelayThresholdMinutes: null },
    })

    const result = await getAlertsAction()

    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })
})
