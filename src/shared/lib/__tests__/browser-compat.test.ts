import { describe, expect, it } from 'vitest'
import {
  detectBrowserCompatibilityFromUserAgent,
  parseBrowserFromUserAgent,
} from '../browser-compat'

describe('browser-compat', () => {
  it('detects modern chrome as supported', () => {
    const ua = 'Mozilla/5.0 AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
    const result = detectBrowserCompatibilityFromUserAgent(ua)
    expect(result.family).toBe('chrome')
    expect(result.majorVersion).toBe(124)
    expect(result.tier).toBe('supported')
  })

  it('marks old safari as limited', () => {
    const ua = 'Mozilla/5.0 Version/16.4 Safari/605.1.15'
    const result = detectBrowserCompatibilityFromUserAgent(ua)
    expect(result.family).toBe('safari')
    expect(result.majorVersion).toBe(16)
    expect(result.tier).toBe('limited')
  })

  it('marks very old firefox as unsupported', () => {
    const ua = 'Mozilla/5.0 Firefox/88.0'
    const result = detectBrowserCompatibilityFromUserAgent(ua)
    expect(result.family).toBe('firefox')
    expect(result.tier).toBe('unsupported')
  })

  it('parses edge user agent correctly', () => {
    const ua = 'Mozilla/5.0 Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
    const parsed = parseBrowserFromUserAgent(ua)
    expect(parsed.family).toBe('edge')
    expect(parsed.majorVersion).toBe(123)
  })

  it('returns unknown for empty user agent', () => {
    const parsed = parseBrowserFromUserAgent('')
    expect(parsed.family).toBe('unknown')
    expect(parsed.majorVersion).toBeNull()
  })
})
