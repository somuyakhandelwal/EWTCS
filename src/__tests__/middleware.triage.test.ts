import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
process.env.SESSION_SECRET = 'test-session-secret-for-middleware'

const redirectSpy = vi.fn()
const nextSpy = vi.fn()
const jsonSpy = vi.fn()
const jwtVerifyMock = vi.fn()

vi.mock('next/server', () => ({
  NextResponse: {
    redirect: (...args: unknown[]) => redirectSpy(...args),
    next: (...args: unknown[]) => nextSpy(...args),
    json: (...args: unknown[]) => jsonSpy(...args),
  },
}))

vi.mock('jose', () => ({
  jwtVerify: (...args: unknown[]) => jwtVerifyMock(...args),
}))

import { middleware } from '@/middleware'

const toReq = (r: unknown) => r as unknown as Parameters<typeof middleware>[0]

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
      hostname: 'localhost',
      protocol: 'http:',
      clone: vi.fn(() => new URL(`http://localhost:3000${pathname}`)),
    },
    url: `http://localhost:3000${pathname}`,
  }
}

describe('middleware triage route access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NODE_ENV', 'test')
    delete process.env.FORCE_HTTPS

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
        role: 'nurse',
        userId: 'nurse-1',
        lastActivity: Date.now(),
      },
    })
  })

  it('allows nurse to access /triage', async () => {
    const response = await middleware(toReq(buildRequest('/triage')))

    expect(nextSpy).toHaveBeenCalledTimes(1)
    expect(redirectSpy).not.toHaveBeenCalled()
    expect(response).toEqual({ type: 'next' })
  })

  it('redirects unauthenticated users away from /triage', async () => {
    await middleware(toReq(buildRequest('/triage', '')))

    expect(redirectSpy).toHaveBeenCalledTimes(1)
    const redirectUrl = redirectSpy.mock.calls[0][0] as URL
    expect(redirectUrl.pathname).toBe('/login')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })
})
