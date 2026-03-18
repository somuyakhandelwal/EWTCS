/**
 * PII Detector Tests — EPIC 17 (US-17.6 / US-17.7)
 *
 * Tests for: detectPii, redactPii, getPiiWarningLabels
 */

import { describe, expect, it } from 'vitest'
import { detectPii, redactPii, getPiiWarningLabels } from '../pii-detector'
import type { PiiCategory } from '../pii-detector'

// ---------------------------------------------------------------------------
// detectPii — phone numbers
// ---------------------------------------------------------------------------
describe('detectPii — PHONE', () => {
  it('detects Indian mobile number (10 digits starting with 9)', () => {
    const result = detectPii('Call me at 9876543210 for updates')
    expect(result.hasPii).toBe(true)
    expect(result.matches[0].category).toBe('PHONE')
    expect(result.matches[0].match).toBe('9876543210')
  })

  it('detects mobile with +91 prefix', () => {
    const result = detectPii('Reach at +919876543210')
    expect(result.hasPii).toBe(true)
    expect(result.matches[0].category).toBe('PHONE')
  })

  it('detects mobile with 0 prefix', () => {
    const result = detectPii('Number: 09876543210')
    expect(result.hasPii).toBe(true)
    expect(result.matches[0].category).toBe('PHONE')
  })

  it('does NOT flag 10 digits starting with 1 (not a valid Indian mobile)', () => {
    const result = detectPii('ID reference 1234567890')
    const phones = result.matches.filter((m) => m.category === 'PHONE')
    expect(phones).toHaveLength(0)
  })

  it('does NOT flag 6-digit numbers (too short)', () => {
    const result = detectPii('Bed EW-01 stage 123456')
    const phones = result.matches.filter((m) => m.category === 'PHONE')
    expect(phones).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// detectPii — Aadhaar
// ---------------------------------------------------------------------------
describe('detectPii — AADHAAR', () => {
  it('detects 12-digit Aadhaar with spaces', () => {
    const result = detectPii('Aadhaar: 1234 5678 9012')
    const matches = result.matches.filter((m) => m.category === 'AADHAAR')
    expect(matches).toHaveLength(1)
  })

  it('detects 12-digit Aadhaar with dashes', () => {
    const result = detectPii('ID: 1234-5678-9012')
    const matches = result.matches.filter((m) => m.category === 'AADHAAR')
    expect(matches).toHaveLength(1)
  })

  it('detects raw 12-digit Aadhaar', () => {
    const result = detectPii('123456789012')
    const matches = result.matches.filter((m) => m.category === 'AADHAAR')
    expect(matches).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// detectPii — PAN
// ---------------------------------------------------------------------------
describe('detectPii — PAN', () => {
  it('detects valid PAN format', () => {
    const result = detectPii('PAN: ABCDE1234F')
    const matches = result.matches.filter((m) => m.category === 'PAN')
    expect(matches).toHaveLength(1)
    expect(matches[0].match).toBe('ABCDE1234F')
  })

  it('does NOT flag lowercase pan-like strings', () => {
    const result = detectPii('abcde1234f')
    const matches = result.matches.filter((m) => m.category === 'PAN')
    expect(matches).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// detectPii — email
// ---------------------------------------------------------------------------
describe('detectPii — EMAIL', () => {
  it('detects standard email', () => {
    const result = detectPii('Contact: john.doe@example.com')
    const matches = result.matches.filter((m) => m.category === 'EMAIL')
    expect(matches).toHaveLength(1)
    expect(matches[0].match).toBe('john.doe@example.com')
  })

  it('detects email in the middle of text', () => {
    const result = detectPii('Send to patient@hospital.in for confirmation')
    const matches = result.matches.filter((m) => m.category === 'EMAIL')
    expect(matches).toHaveLength(1)
  })

  it('does NOT flag text without @ symbol', () => {
    const result = detectPii('Stage update to Triage completed')
    const matches = result.matches.filter((m) => m.category === 'EMAIL')
    expect(matches).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// detectPii — MRN
// ---------------------------------------------------------------------------
describe('detectPii — MRN', () => {
  it('detects MRN with hash separator', () => {
    const result = detectPii('Patient MRN#1234567 admitted')
    const matches = result.matches.filter((m) => m.category === 'MRN')
    expect(matches).toHaveLength(1)
  })

  it('detects REG number', () => {
    const result = detectPii('REG-987654')
    const matches = result.matches.filter((m) => m.category === 'MRN')
    expect(matches).toHaveLength(1)
  })

  it('detects UHID format', () => {
    const result = detectPii('UHID 00123456')
    const matches = result.matches.filter((m) => m.category === 'MRN')
    expect(matches).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// detectPii — DOB
// ---------------------------------------------------------------------------
describe('detectPii — DOB', () => {
  it('detects "DOB: 12/05/1985"', () => {
    const result = detectPii('DOB: 12/05/1985')
    const matches = result.matches.filter((m) => m.category === 'DOB')
    expect(matches).toHaveLength(1)
  })

  it('detects "date of birth 01-Jan-1990"', () => {
    const result = detectPii('date of birth 01-Jan-1990')
    const matches = result.matches.filter((m) => m.category === 'DOB')
    expect(matches).toHaveLength(1)
  })

  it('does NOT flag standalone date without DOB label', () => {
    const result = detectPii('Admitted on 12/05/2024')
    const matches = result.matches.filter((m) => m.category === 'DOB')
    expect(matches).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// detectPii — patient name
// ---------------------------------------------------------------------------
describe('detectPii — PATIENT_NAME', () => {
  it('detects "Patient: Ramesh Kumar"', () => {
    const result = detectPii('Patient: Ramesh Kumar admitted to EW-01')
    const matches = result.matches.filter((m) => m.category === 'PATIENT_NAME')
    expect(matches).toHaveLength(1)
  })

  it('detects "Name: Priya Sharma"', () => {
    const result = detectPii('Name: Priya Sharma')
    const matches = result.matches.filter((m) => m.category === 'PATIENT_NAME')
    expect(matches).toHaveLength(1)
  })

  it('does NOT flag generic capitalized words without label', () => {
    const result = detectPii('Moved to ICU ward')
    const matches = result.matches.filter((m) => m.category === 'PATIENT_NAME')
    expect(matches).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Empty / clean input
// ---------------------------------------------------------------------------
describe('detectPii — clean input', () => {
  it('returns no matches for clean clinical notes', () => {
    const result = detectPii('Patient moved to assessment stage — high BP noted')
    expect(result.hasPii).toBe(false)
    expect(result.matches).toHaveLength(0)
    expect(result.summary).toBe('')
  })

  it('returns no matches for empty string', () => {
    const result = detectPii('')
    expect(result.hasPii).toBe(false)
  })

  it('returns no matches for whitespace-only string', () => {
    const result = detectPii('   ')
    expect(result.hasPii).toBe(false)
  })
})

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
    // Two PHONE matches but only one "Phone number" label
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
