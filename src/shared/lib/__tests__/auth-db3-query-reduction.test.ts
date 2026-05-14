import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockVerifySession,
  mockDeleteSession,
  mockDecodeJwt,
  mockPoolQuery,
  mockCookies,
  tokenQueue,
} = vi.hoisted(() => ({
  mockVerifySession: vi.fn(),
  mockDeleteSession: vi.fn(),
  mockDecodeJwt: vi.fn(),
  mockPoolQuery: vi.fn(),
  mockCookies: vi.fn(),
  tokenQueue: [] as string[],
}))

vi.mock('jose', () => ({
  decodeJwt: mockDecodeJwt,
  jwtVerify: vi.fn(),
}))

vi.mock('@/shared/lib/session', () => ({
  verifySession: mockVerifySession,
  deleteSession: mockDeleteSession,
}))

vi.mock('next/headers', () => ({
  cookies: mockCookies,
}))

vi.mock('@/shared/lib/db', () => ({
  default: { query: mockPoolQuery },
}))

import { clearTokenBlacklistCache } from '@/shared/lib/auth-service'
import { clearActiveUserCache, verifyActiveSession } from '@/shared/lib/active-session'

describe('DB3-01 auth query reduction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-06T00:00:00.000Z'))

    clearTokenBlacklistCache()
    clearActiveUserCache()

    tokenQueue.length = 0
    mockDeleteSession.mockResolvedValue(undefined)

    mockDecodeJwt.mockImplementation(() => ({
      exp: Math.floor((Date.now() + 60_000) / 1000),
    }))

    mockPoolQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('token_blacklist')) {
        return { rows: [] }
      }
      if (sql.includes('SELECT is_active FROM users')) {
        return { rows: [{ is_active: true }] }
      }
      throw new Error(`Unexpected SQL in test: ${sql}`)
    })

    mockCookies.mockImplementation(async () => ({
      get: vi.fn(() => {
        const token = tokenQueue.shift()
        return token ? { value: token } : undefined
      }),
    }))
  })

  it('reduces auth DB queries by at least 80% for 10 nurses polling every 3s', async () => {
    const nurseCount = 10
    const pollingIntervalMs = 3_000
    const totalDurationMs = 60_000
    const rounds = totalDurationMs / pollingIntervalMs

    const sessions = Array.from({ length: nurseCount }, (_, index) => ({
      userId: `user-${index + 1}`,
      username: `nurse-${index + 1}`,
      role: 'nurse',
    }))

    for (let round = 0; round < rounds; round += 1) {
      const roundSessions = sessions.map((session) => ({ ...session }))
      const roundTokens = sessions.map((session) => `token-${session.userId}`)

      mockVerifySession.mockImplementation(() => {
        const nextSession = roundSessions.shift()
        return Promise.resolve(nextSession ?? null)
      })

      tokenQueue.push(...roundTokens)

      await Promise.all(sessions.map(() => verifyActiveSession()))

      vi.advanceTimersByTime(pollingIntervalMs)
    }

    const authDbCalls = mockPoolQuery.mock.calls.length
    const baselineNoCacheCalls = nurseCount * rounds * 2
    const reductionPercent = ((baselineNoCacheCalls - authDbCalls) / baselineNoCacheCalls) * 100

    expect(authDbCalls).toBeLessThan(baselineNoCacheCalls)
    expect(reductionPercent).toBeGreaterThanOrEqual(80)
  })
})
