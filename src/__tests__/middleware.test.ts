import { beforeEach, describe, expect, it, vi } from 'vitest'

process.env.SESSION_SECRET = 'test-session-secret-for-middleware'

const redirectSpy = vi.fn()
const nextSpy = vi.fn()
const jwtVerifyMock = vi.fn()

vi.mock('next/server', () => ({
  NextResponse: {
    redirect: (...args: unknown[]) => redirectSpy(...args),
    next: (...args: unknown[]) => nextSpy(...args),
  },
}))

vi.mock('jose', () => ({
  jwtVerify: (...args: unknown[]) => jwtVerifyMock(...args),
}))

import { middleware } from '@/middleware'

function buildRequest(pathname: string, token = 'session-token') {
  return {
    cookies: {
      get: vi.fn(() => (token ? { value: token } : undefined)),
    },
    headers: {
      get: vi.fn(() => null),
    },
    nextUrl: {
      pathname,
    },
    url: `http://localhost:3000${pathname}`,
  } as never
}

describe('middleware analytics role access', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    redirectSpy.mockImplementation((url: URL) => ({
      type: 'redirect',
      url: url.toString(),
      cookies: {
        delete: vi.fn(),
      },
    }))

    nextSpy.mockImplementation(() => ({ type: 'next' }))

    jwtVerifyMock.mockResolvedValue({
      payload: {
        role: 'auditor',
        userId: 'auditor-1',
        lastActivity: Date.now(),
      },
    })
  })

  it('allows auditor to access /analytics', async () => {
    const response = await middleware(buildRequest('/analytics'))

    expect(nextSpy).toHaveBeenCalledTimes(1)
    expect(redirectSpy).not.toHaveBeenCalled()
    expect(response).toEqual({ type: 'next' })
  })

  it('redirects nurse away from /analytics', async () => {
    jwtVerifyMock.mockResolvedValue({
      payload: {
        role: 'nurse',
        userId: 'nurse-1',
        lastActivity: Date.now(),
      },
    })

    await middleware(buildRequest('/analytics'))

    expect(redirectSpy).toHaveBeenCalledTimes(1)
    const redirectUrl = redirectSpy.mock.calls[0][0] as URL
    expect(redirectUrl.pathname).toBe('/login')
  })
})
