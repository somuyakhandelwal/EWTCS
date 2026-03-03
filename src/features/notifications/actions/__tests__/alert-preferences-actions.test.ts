import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/lib/auth', () => ({ requireRole: vi.fn() }))
vi.mock('@/shared/lib/audit', () => ({ logAudit: vi.fn() }))
vi.mock('@/shared/config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@/features/notifications/lib/alert-preferences-queries', () => ({
  readAlertPreferences: vi.fn(),
  upsertAlertPreferences: vi.fn(),
  resetAlertPreferences: vi.fn(),
}))

import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import {
  readAlertPreferences,
  resetAlertPreferences,
  upsertAlertPreferences,
} from '@/features/notifications/lib/alert-preferences-queries'
import { DEFAULT_ALERT_PREFERENCES } from '@/features/notifications/lib/default-alert-preferences'
import {
  getMyAlertPreferences,
  resetMyAlertPreferences,
  updateMyAlertPreferences,
} from '@/features/notifications/actions/alert-preferences-actions'

const SUPERVISOR_SESSION = {
  userId: 'supervisor-1',
  role: 'supervisor',
}

describe('alert-preferences-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks unauthorised role when reading preferences', async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error('Unauthorized: Required role(s): supervisor, admin'))

    const result = await getMyAlertPreferences()

    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to load alert preferences')
  })

  it('returns validation message when escalation threshold is invalid', async () => {
    vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION as never)

    const result = await updateMyAlertPreferences({
      preferences: {
        enabledAlertTypes: {
          delayedBeds: true,
          escalations: true,
          dispositionBottlenecks: true,
          systemErrors: true,
        },
        thresholds: {
          delayMinutes: 180,
          escalationMinutes: 180,
          bottleneckCount: 3,
        },
      },
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Escalation threshold must be greater than delay threshold')
    expect(upsertAlertPreferences).not.toHaveBeenCalled()
    expect(logAudit).not.toHaveBeenCalled()
  })

  it('resets preferences to defaults and writes audit log', async () => {
    vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION as never)
    vi.mocked(resetAlertPreferences).mockResolvedValue(undefined)
    vi.mocked(logAudit).mockResolvedValue(undefined)

    const result = await resetMyAlertPreferences()

    expect(result.success).toBe(true)
    expect(result.data).toEqual(DEFAULT_ALERT_PREFERENCES)
    expect(resetAlertPreferences).toHaveBeenCalledWith('supervisor-1')
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'ALERT_PREFERENCES_RESET',
        entityType: 'alert_preferences',
        entityId: 'supervisor-1',
        performedBy: 'supervisor-1',
      })
    )
  })

  it('creates defaults on first load when no preference row exists', async () => {
    vi.mocked(requireRole).mockResolvedValue(SUPERVISOR_SESSION as never)
    vi.mocked(readAlertPreferences).mockResolvedValue(null)
    vi.mocked(upsertAlertPreferences).mockResolvedValue(undefined)

    const result = await getMyAlertPreferences()

    expect(result.success).toBe(true)
    expect(result.data).toEqual(DEFAULT_ALERT_PREFERENCES)
    expect(upsertAlertPreferences).toHaveBeenCalledWith('supervisor-1', DEFAULT_ALERT_PREFERENCES)
  })
})
