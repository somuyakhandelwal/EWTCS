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
import { getRecentErrors, acknowledgeError } from '@/lib/server/error-store'
import {
  acknowledgeSystemAlert,
  getUnacknowledgedAlertCount,
} from '@/features/notifications/actions/alert-screen-actions'
import {
  SUPERVISOR_SESSION, DELAY_MS,
  makeBedGridData, SYSTEM_ERROR,
} from './alert-screen-fixtures'

const EMPTY_ERRORS: Awaited<ReturnType<typeof getRecentErrors>> = []

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
