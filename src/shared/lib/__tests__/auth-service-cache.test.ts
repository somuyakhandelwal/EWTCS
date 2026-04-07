import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPoolQuery, mockDecodeJwt, mockJwtVerify } = vi.hoisted(() => ({
  mockPoolQuery: vi.fn(),
  mockDecodeJwt: vi.fn(),
  mockJwtVerify: vi.fn(),
}))

vi.mock('jose', () => ({
  decodeJwt: mockDecodeJwt,
  jwtVerify: mockJwtVerify,
}))

vi.mock('@/shared/lib/db', () => ({
  default: { query: mockPoolQuery },
}))

vi.mock('@/shared/config/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    critical: vi.fn(),
  },
}))

import {
  clearTokenBlacklistCache,
  isTokenBlacklisted,
  invalidateToken,
} from '@/shared/lib/auth-service'

describe('auth-service blacklist cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearTokenBlacklistCache()

    mockDecodeJwt.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 600 })
    mockJwtVerify.mockResolvedValue({
      payload: { exp: Math.floor(Date.now() / 1000) + 600 },
    })
  })

  it('caches negative blacklist lookups for short TTL and avoids repeated DB hits', async () => {
    const token = 'token-negative'
    mockPoolQuery.mockResolvedValue({ rows: [] })

    const first = await isTokenBlacklisted(token)
    const second = await isTokenBlacklisted(token)

    expect(first).toBe(false)
    expect(second).toBe(false)
    expect(mockPoolQuery).toHaveBeenCalledTimes(1)
  })

  it('caches positive blacklist result for token remaining TTL', async () => {
    const token = 'token-positive'
    mockPoolQuery.mockResolvedValue({ rows: [{ exists: 1 }] })

    const first = await isTokenBlacklisted(token)
    const second = await isTokenBlacklisted(token)

    expect(first).toBe(true)
    expect(second).toBe(true)
    expect(mockPoolQuery).toHaveBeenCalledTimes(1)
  })

  it('primes cache on invalidateToken so immediate checks skip DB read', async () => {
    const token = 'token-to-invalidate'

    // First query call belongs to invalidateToken insert.
    mockPoolQuery.mockResolvedValueOnce({ rows: [] })

    await invalidateToken(token)
    const blacklisted = await isTokenBlacklisted(token)

    expect(blacklisted).toBe(true)
    expect(mockPoolQuery).toHaveBeenCalledTimes(1)
  })
})
