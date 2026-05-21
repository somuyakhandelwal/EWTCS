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

describe('middleware HTTPS enforcement', () => {
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
    jsonSpy.mockImplementation((body: unknown, init?: { status?: number }) => ({
      type: 'json',
      body,
      status: init?.status,
    }))

    jwtVerifyMock.mockResolvedValue({
      payload: {
        role: 'admin',
        userId: 'admin-1',
        lastActivity: Date.now(),
      },
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('redirects insecure production requests to HTTPS when enabled', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('FORCE_HTTPS', 'true')

    const request = buildRequest('/dashboard')
    request.nextUrl.hostname = 'example.com'
    request.headers.get = vi.fn((key: string) => {
      if (key === 'x-forwarded-proto') return 'http'
      return null
    }) as never

    await middleware(toReq(request))

    expect(redirectSpy).toHaveBeenCalledTimes(1)
    const redirectUrl = redirectSpy.mock.calls[0][0] as URL
    const statusCode = redirectSpy.mock.calls[0][1] as number
    expect(redirectUrl.protocol).toBe('https:')
    expect(redirectUrl.pathname).toBe('/dashboard')
    expect(statusCode).toBe(308)
  })

  it('redirects insecure staging requests to HTTPS when enabled', async () => {
    vi.stubEnv('NODE_ENV', 'staging')
    vi.stubEnv('FORCE_HTTPS', 'true')

    const request = buildRequest('/login')
    request.nextUrl.hostname = 'staging.example.com'
    request.headers.get = vi.fn(() => 'http')

    await middleware(toReq(request))

    expect(redirectSpy).toHaveBeenCalledTimes(1)
    const redirectUrl = redirectSpy.mock.calls[0][0] as URL
    expect(redirectUrl.protocol).toBe('https:')
  })

  it('allows insecure requests when FORCE_HTTPS=false', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('FORCE_HTTPS', 'false')

    const request = buildRequest('/dashboard')
    request.nextUrl.hostname = 'example.com'
    request.headers.get = vi.fn(() => 'http')

    const response = await middleware(toReq(request))

    expect(redirectSpy).not.toHaveBeenCalled()
    expect(nextSpy).toHaveBeenCalledTimes(1)
    expect(response).toEqual({ type: 'next' })
  })

  it('does not redirect localhost requests even when HTTPS enforcement is enabled', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('FORCE_HTTPS', 'true')

    const request = buildRequest('/dashboard')
    request.nextUrl.hostname = 'localhost'
    request.headers.get = vi.fn(() => 'http')

    const response = await middleware(toReq(request))

    expect(redirectSpy).not.toHaveBeenCalled()
    expect(nextSpy).toHaveBeenCalledTimes(1)
    expect(response).toEqual({ type: 'next' })
  })
})
