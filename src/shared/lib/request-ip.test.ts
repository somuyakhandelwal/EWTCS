import { describe, expect, it } from 'vitest'
import { getClientIpFromHeaders } from '@/shared/lib/request-ip'

describe('getClientIpFromHeaders', () => {
  it('returns first IP from x-forwarded-for list', () => {
    const requestHeaders = new Headers({
      'x-forwarded-for': '203.0.113.10, 10.0.0.1, 10.0.0.2',
    })

    expect(getClientIpFromHeaders(requestHeaders)).toBe('203.0.113.10')
  })

  it('falls back to x-real-ip when x-forwarded-for is missing', () => {
    const requestHeaders = new Headers({
      'x-real-ip': '198.51.100.20',
    })

    expect(getClientIpFromHeaders(requestHeaders)).toBe('198.51.100.20')
  })

  it('supports bracketed IPv6 values', () => {
    const requestHeaders = new Headers({
      'x-forwarded-for': '[2001:db8::7]',
    })

    expect(getClientIpFromHeaders(requestHeaders)).toBe('2001:db8::7')
  })

  it('returns null when all headers are missing or invalid', () => {
    const requestHeaders = new Headers({
      'x-forwarded-for': 'unknown',
      'x-real-ip': 'not-an-ip',
      'cf-connecting-ip': 'invalid-value',
    })

    expect(getClientIpFromHeaders(requestHeaders)).toBeNull()
  })
})
