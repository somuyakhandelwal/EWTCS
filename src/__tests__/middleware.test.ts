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

import { config, middleware } from '@/middleware'

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
  } as never
}

describe('middleware analytics role access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NODE_ENV = 'test'
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

    jwtVerifyMock.mockResolvedValue({
      payload: {
        role: 'admin',
        userId: 'admin-1',
        lastActivity: Date.now(),
      },
    })
  })

  it('redirects insecure production requests to HTTPS when enabled', async () => {
    process.env.NODE_ENV = 'production'
    process.env.FORCE_HTTPS = 'true'

    const request = buildRequest('/dashboard')
    request.nextUrl.hostname = 'example.com'
    request.headers.get = vi.fn((key: string) => {
      if (key === 'x-forwarded-proto') return 'http'
      return null
    }) as never

    await middleware(request)

    expect(redirectSpy).toHaveBeenCalledTimes(1)
    const redirectUrl = redirectSpy.mock.calls[0][0] as URL
    const statusCode = redirectSpy.mock.calls[0][1] as number
    expect(redirectUrl.protocol).toBe('https:')
    expect(redirectUrl.pathname).toBe('/dashboard')
    expect(statusCode).toBe(308)
  })

  it('redirects insecure staging requests to HTTPS when enabled', async () => {
    process.env.NODE_ENV = 'staging'
    process.env.FORCE_HTTPS = 'true'

    const request = buildRequest('/login')
    request.nextUrl.hostname = 'staging.example.com'
    request.headers.get = vi.fn(() => 'http') as never

    await middleware(request)

    expect(redirectSpy).toHaveBeenCalledTimes(1)
    const redirectUrl = redirectSpy.mock.calls[0][0] as URL
    expect(redirectUrl.protocol).toBe('https:')
  })

  it('allows insecure requests when FORCE_HTTPS=false', async () => {
    process.env.NODE_ENV = 'production'
    process.env.FORCE_HTTPS = 'false'

    const request = buildRequest('/dashboard')
    request.nextUrl.hostname = 'example.com'
    request.headers.get = vi.fn(() => 'http') as never

    const response = await middleware(request)

    expect(redirectSpy).not.toHaveBeenCalled()
    expect(nextSpy).toHaveBeenCalledTimes(1)
    expect(response).toEqual({ type: 'next' })
  })

  it('does not redirect localhost requests even when HTTPS enforcement is enabled', async () => {
    process.env.NODE_ENV = 'production'
    process.env.FORCE_HTTPS = 'true'

    const request = buildRequest('/dashboard')
    request.nextUrl.hostname = 'localhost'
    request.headers.get = vi.fn(() => 'http') as never

    const response = await middleware(request)

    expect(redirectSpy).not.toHaveBeenCalled()
    expect(nextSpy).toHaveBeenCalledTimes(1)
    expect(response).toEqual({ type: 'next' })
  })

  it('uses a global matcher so HTTPS enforcement applies beyond protected pages', () => {
    expect(config.matcher).toContain('/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)')
  })
})
