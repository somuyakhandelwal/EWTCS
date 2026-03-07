// Alert Queries Tests
// EPIC 15: Notifications & Alerts (US-15.4)

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/lib/db', () => ({ query: vi.fn() }))
vi.mock('@/features/bed-dashboard/lib/bed-bottleneck-queries', () => ({
  getBedsWithElapsedTime: vi.fn(),
}))
vi.mock('@/shared/config/env', () => ({
  config: { alert: { delayThresholdMs: 10_800_000 } },
}))
vi.mock('@/features/bed-dashboard/types/bed', () => ({
  DISPOSITION_DELAY_REASON_LABELS: {},
}))
vi.mock('@/features/bed-dashboard/lib/utils', () => ({
  formatElapsedTime: (ms: number) => `${Math.round(ms / 3_600_000)}h`,
}))

import { query } from '@/shared/lib/db'
import { getBedsWithElapsedTime } from '@/features/bed-dashboard/lib/bed-bottleneck-queries'
import { getActiveAlerts } from '../alert-queries'

const NOW = new Date('2026-03-07T12:00:00Z')

const makeBed = (overrides = {}) => ({
  id: 'bed-1',
  bedNumber: 'ER-01',
  isDelayed: false,
  isDispositionBottleneck: false,
  elapsedTimeMs: null,
  dispositionElapsedMs: null,
  currentStage: { name: 'Triage' },
  patientStartTime: new Date('2026-03-07T08:00:00Z'),
  lastStageChange: new Date('2026-03-07T10:00:00Z'),
  dispositionDelayReason: null,
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.setSystemTime(NOW)
})

describe('getActiveAlerts', () => {
  it('returns a delayed_bed warning alert', async () => {
    vi.mocked(getBedsWithElapsedTime).mockResolvedValue([
      makeBed({ isDelayed: true, elapsedTimeMs: 14_400_000 }), // 4h — below critical 6h
    ] as never)
    // No acks, no error events
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [] } as never) // getActiveAcknowledgments
      .mockResolvedValueOnce({ rows: [] } as never) // getRecentErrorEvents

    const alerts = await getActiveAlerts()

    expect(alerts).toHaveLength(1)
    expect(alerts[0].type).toBe('delayed_bed')
    expect(alerts[0].severity).toBe('warning')
    expect(alerts[0].bedId).toBe('bed-1')
    expect(alerts[0].isAcknowledged).toBe(false)
  })

  it('marks a delayed_bed as critical when elapsed >= 2× delay threshold', async () => {
    vi.mocked(getBedsWithElapsedTime).mockResolvedValue([
      makeBed({ isDelayed: true, elapsedTimeMs: 21_600_000 }), // 6h = 2 × 3h threshold
    ] as never)
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [] } as never)

    const alerts = await getActiveAlerts()

    expect(alerts[0].severity).toBe('critical')
  })

  it('returns a disposition_bottleneck warning alert', async () => {
    vi.mocked(getBedsWithElapsedTime).mockResolvedValue([
      makeBed({ isDispositionBottleneck: true, dispositionElapsedMs: 1_800_000 }), // 30 min
    ] as never)
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [] } as never)

    const alerts = await getActiveAlerts()

    expect(alerts).toHaveLength(1)
    expect(alerts[0].type).toBe('disposition_bottleneck')
    expect(alerts[0].severity).toBe('warning')
  })

  it('returns a system_error critical alert from error_events', async () => {
    vi.mocked(getBedsWithElapsedTime).mockResolvedValue([] as never)
    const createdAt = new Date('2026-03-07T11:00:00Z')
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [] } as never) // acks
      .mockResolvedValueOnce({             // error events
        rows: [{
          id: 'err-1',
          level: 'CRITICAL',
          category: 'database',
          message: 'Connection pool exhausted',
          createdAt,
        }],
      } as never)

    const alerts = await getActiveAlerts()

    expect(alerts).toHaveLength(1)
    expect(alerts[0].type).toBe('system_error')
    expect(alerts[0].severity).toBe('critical')
    expect(alerts[0].bedId).toBeNull()
    expect(alerts[0].bedNumber).toBe('database')
    expect(alerts[0].title).toBe('System Error — database')
    expect(alerts[0].startedAt).toEqual(createdAt)
  })

  it('returns a system_error warning alert for ERROR level events', async () => {
    vi.mocked(getBedsWithElapsedTime).mockResolvedValue([] as never)
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({
        rows: [{
          id: 'err-2',
          level: 'ERROR',
          category: 'api',
          message: 'External service timeout',
          createdAt: new Date('2026-03-07T11:30:00Z'),
        }],
      } as never)

    const alerts = await getActiveAlerts()

    expect(alerts[0].severity).toBe('warning')
    expect(alerts[0].type).toBe('system_error')
  })

  it('marks an alert as acknowledged when an ack row exists', async () => {
    const ackExpiry = new Date('2026-03-07T16:00:00Z')
    vi.mocked(getBedsWithElapsedTime).mockResolvedValue([
      makeBed({ isDelayed: true, elapsedTimeMs: 14_400_000 }),
    ] as never)
    vi.mocked(query)
      .mockResolvedValueOnce({
        rows: [{
          id: 'ack-1',
          alertType: 'delayed_bed',
          alertKey: 'delayed_bed:bed-1',
          bedId: 'bed-1',
          acknowledgedByUserId: 'sup-1',
          acknowledgedByUsername: 'supervisor1',
          acknowledgedAt: new Date('2026-03-07T12:00:00Z'),
          expiresAt: ackExpiry,
          notes: null,
        }],
      } as never)
      .mockResolvedValueOnce({ rows: [] } as never)

    const alerts = await getActiveAlerts()

    expect(alerts[0].isAcknowledged).toBe(true)
    expect(alerts[0].acknowledgedBy).toBe('supervisor1')
    expect(alerts[0].acknowledgedUntil).toEqual(ackExpiry)
  })

  it('returns empty array when no beds are delayed and no error events', async () => {
    vi.mocked(getBedsWithElapsedTime).mockResolvedValue([makeBed()] as never)
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [] } as never)

    const alerts = await getActiveAlerts()

    expect(alerts).toHaveLength(0)
  })
})
