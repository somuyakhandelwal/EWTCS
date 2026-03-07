// Alert Server Actions Tests — acknowledgeAlertAction
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
import { logAudit } from '@/shared/lib/audit'
import { upsertAcknowledgment } from '@/features/alerts/lib/alert-mutations'
import { acknowledgeAlertAction } from '../alert-actions'

const SUPERVISOR_SESSION = { userId: 'sup-1', username: 'supervisor1', role: 'supervisor' }

describe('acknowledgeAlertAction', () => {
  beforeEach(() => vi.clearAllMocks())

  it('blocks non-supervisor roles', async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error('Unauthorized'))

    const result = await acknowledgeAlertAction({
      alertKey: 'delayed_bed:bed-1',
      alertType: 'delayed_bed',
      bedId: 'bed-1',
      expiryHours: 2,
    })

    expect(result.success).toBe(false)
  })

  it('rejects an unknown alertType', async () => {
    vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION as never)

    const result = await acknowledgeAlertAction({
      alertKey: 'unknown:x',
      alertType: 'unknown_type' as never,
      bedId: null,
      expiryHours: 2,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
    expect(upsertAcknowledgment).not.toHaveBeenCalled()
  })

  it('acknowledges a delayed_bed alert and writes audit log', async () => {
    vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION as never)
    vi.mocked(upsertAcknowledgment).mockResolvedValue(undefined)
    vi.mocked(logAudit).mockResolvedValue(undefined)

    const result = await acknowledgeAlertAction({
      alertKey:   'delayed_bed:bed-1',
      alertType:  'delayed_bed',
      bedId:      'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      expiryHours: 4,
    })

    expect(result.success).toBe(true)
    expect(upsertAcknowledgment).toHaveBeenCalledWith(
      expect.objectContaining({ alertKey: 'delayed_bed:bed-1', expiryHours: 4 }),
      'sup-1'
    )
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: 'ACKNOWLEDGE', entityType: 'alert' })
    )
  })

  it('acknowledges a system_error alert with bedId null', async () => {
    vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION as never)
    vi.mocked(upsertAcknowledgment).mockResolvedValue(undefined)
    vi.mocked(logAudit).mockResolvedValue(undefined)

    const result = await acknowledgeAlertAction({
      alertKey: 'system_error:err-abc',
      alertType: 'system_error',
      bedId: null,
      expiryHours: 1,
    })

    expect(result.success).toBe(true)
    expect(upsertAcknowledgment).toHaveBeenCalledWith(
      expect.objectContaining({ alertKey: 'system_error:err-abc', bedId: null }),
      'sup-1'
    )
  })

  it('returns error when upsert throws', async () => {
    vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION as never)
    vi.mocked(upsertAcknowledgment).mockRejectedValue(new Error('DB error'))

    const result = await acknowledgeAlertAction({
      alertKey:   'delayed_bed:bed-2',
      alertType:  'delayed_bed',
      bedId:      'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      expiryHours: 2,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('DB error')
  })
})
