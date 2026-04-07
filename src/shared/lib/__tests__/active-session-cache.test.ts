import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockVerifySession,
  mockDeleteSession,
  mockIsTokenBlacklisted,
  mockPoolQuery,
} = vi.hoisted(() => ({
  mockVerifySession: vi.fn(),
  mockDeleteSession: vi.fn(),
  mockIsTokenBlacklisted: vi.fn(),
  mockPoolQuery: vi.fn(),
}))

vi.mock('@/shared/lib/session', () => ({
  verifySession: mockVerifySession,
  deleteSession: mockDeleteSession,
}))

vi.mock('@/shared/lib/auth-service', () => ({
  isTokenBlacklisted: mockIsTokenBlacklisted,
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => ({ value: 'token-123' })),
  })),
}))

vi.mock('@/shared/lib/db', () => ({
  default: { query: mockPoolQuery },
}))

import {
  clearActiveUserCache,
  invalidateActiveUserCache,
  verifyActiveSession,
} from '@/shared/lib/active-session'

describe('active-session is_active cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearActiveUserCache()

    mockVerifySession.mockResolvedValue({
      userId: 'user-1',
      username: 'nurse1',
      role: 'nurse',
    })
    mockIsTokenBlacklisted.mockResolvedValue(false)
  })

  it('caches active status for a user and avoids duplicate users query', async () => {
    mockPoolQuery.mockResolvedValue({ rows: [{ is_active: true }] })

    const first = await verifyActiveSession()
    const second = await verifyActiveSession()

    expect(first).not.toBeNull()
    expect(second).not.toBeNull()
    expect(mockPoolQuery).toHaveBeenCalledTimes(1)
  })

  it('uses invalidation hook to force fresh DB read after admin status change', async () => {
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ is_active: true }] })
      .mockResolvedValueOnce({ rows: [{ is_active: false }] })

    const beforeInvalidate = await verifyActiveSession()
    invalidateActiveUserCache('user-1')
    const afterInvalidate = await verifyActiveSession()

    expect(beforeInvalidate).not.toBeNull()
    expect(afterInvalidate).toBeNull()
    expect(mockDeleteSession).toHaveBeenCalledTimes(1)
    expect(mockPoolQuery).toHaveBeenCalledTimes(2)
  })
})
