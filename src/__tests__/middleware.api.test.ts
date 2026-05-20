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

import { config, middleware } from '@/middleware'

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

describe('middleware API session guard exemptions', () => {
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

  it('allows /api/external/* without session cookie', async () => {
    const response = await middleware(toReq(buildRequest('/api/external/beds', '')))

    expect(nextSpy).toHaveBeenCalledTimes(1)
    expect(redirectSpy).not.toHaveBeenCalled()
    expect(response).toEqual({ type: 'next' })
  })

  it('still blocks protected /api/* routes without session cookie', async () => {
    const response = await middleware(toReq(buildRequest('/api/bed-history/correct', '')))

    expect(nextSpy).not.toHaveBeenCalled()
    expect(redirectSpy).not.toHaveBeenCalled()
    expect(jsonSpy).toHaveBeenCalledTimes(1)
    expect(response).toEqual({ type: 'json', body: { error: 'Unauthorized' }, status: 401 })
  })

  it('uses a global matcher so HTTPS enforcement applies beyond protected pages', () => {
    expect(config.matcher).toContain('/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)')
  })
})