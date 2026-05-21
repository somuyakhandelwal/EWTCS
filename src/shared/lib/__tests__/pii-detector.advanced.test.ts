/**
 * PII Detector Tests — EPIC 17 (US-17.6 / US-17.7)
 *
 * Additional coverage for multi-type detection, whitelist behavior,
 * redaction, and warning labels.
 */

import { describe, expect, it } from 'vitest'
import { detectPii, redactPii, getPiiWarningLabels } from '../pii-detector'

// ---------------------------------------------------------------------------
// Multiple PII types in one string
// ---------------------------------------------------------------------------
describe('detectPii — multiple types', () => {
  it('detects both phone and email in one string', () => {
    const result = detectPii('Call 9876543210 or email john@hospital.com')
    const categories = result.matches.map((m) => m.category)
    expect(categories).toContain('PHONE')
    expect(categories).toContain('EMAIL')
    expect(result.hasPii).toBe(true)
  })

  it('summary contains all detected categories', () => {
    const result = detectPii('MRN#12345 DOB: 01/01/1990 ph: 9988776655')
    expect(result.summary).toContain('MRN')
    expect(result.summary).toContain('DOB')
    expect(result.summary).toContain('PHONE')
  })
})

// ---------------------------------------------------------------------------
// Whitelist
// ---------------------------------------------------------------------------
describe('detectPii — whitelist', () => {
  it('skips whitelisted PHONE category', () => {
    const result = detectPii('Call 9876543210', ['PHONE'])
    const phones = result.matches.filter((m) => m.category === 'PHONE')
    expect(phones).toHaveLength(0)
  })

  it('still detects other categories when one is whitelisted', () => {
    const result = detectPii('Call 9876543210 email: x@y.com', ['PHONE'])
    const emails = result.matches.filter((m) => m.category === 'EMAIL')
    expect(emails).toHaveLength(1)
  })

  it('returns no PII when all detected categories are whitelisted', () => {
    const result = detectPii('9876543210', ['PHONE'])
    expect(result.hasPii).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// redactPii
// ---------------------------------------------------------------------------
describe('redactPii', () => {
  it('replaces phone with [REDACTED:PHONE]', () => {
    const out = redactPii('Call 9876543210 please')
    expect(out).toContain('[REDACTED:PHONE]')
    expect(out).not.toContain('9876543210')
  })

  it('returns original string when no PII found', () => {
    const text = 'Patient moved to assessment'
    expect(redactPii(text)).toBe(text)
  })

  it('redacts multiple PII occurrences in order', () => {
    const text = 'Email: a@b.com phone: 9876543210'
    const out = redactPii(text)
    expect(out).not.toContain('a@b.com')
    expect(out).not.toContain('9876543210')
    expect(out).toContain('[REDACTED:EMAIL]')
    expect(out).toContain('[REDACTED:PHONE]')
  })
})

// ---------------------------------------------------------------------------
// getPiiWarningLabels
// ---------------------------------------------------------------------------
describe('getPiiWarningLabels', () => {
  it('returns comma-separated labels without duplicates', () => {
    const result = detectPii('Call 9876543210 or 8765432109')
    const labels = getPiiWarningLabels(result.matches)
    expect(labels).toBe('Phone number')
  })

  it('returns multiple distinct labels', () => {
    const result = detectPii('9876543210 and a@b.com')
    const labels = getPiiWarningLabels(result.matches)
    expect(labels).toContain('Phone number')
    expect(labels).toContain('Email address')
  })

  it('returns empty string for no matches', () => {
    expect(getPiiWarningLabels([])).toBe('')
  })
})