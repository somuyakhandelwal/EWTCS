/**
 * Unit tests for PII Detection utility
 * US-13.9: Code Quality & Testing
 * US-17.6: Scrub PII from inputs
 * US-17.8: Clinical data safety valve
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { detectPII, hasPII, piiRefine } from '@/shared/lib/pii'

// ---------------------------------------------------------------------------
// detectPII
// ---------------------------------------------------------------------------

describe('detectPII', () => {
  it('returns empty array for safe text', () => {
    expect(detectPII('Bed cleaned and prepared for next patient')).toEqual([])
    expect(detectPII('Waiting for discharge papers')).toEqual([])
    expect(detectPII('')).toEqual([])
  })

  it('detects email addresses', () => {
    const matches = detectPII('Contact john.doe@hospital.com for info')
    expect(matches.some((m) => m.type === 'email')).toBe(true)
  })

  it('detects phone numbers', () => {
    const matches = detectPII('Call +91-9876543210 for assistance')
    expect(matches.some((m) => m.type === 'phone')).toBe(true)
  })

  it('detects MRN patterns', () => {
    const matches = detectPII('Patient MRN12345 admitted')
    expect(matches.some((m) => m.type === 'mrn')).toBe(true)
  })

  it('detects Indian Aadhaar numbers', () => {
    const matches = detectPII('Aadhaar 1234 5678 9012')
    expect(matches.some((m) => m.type === 'aadhaar')).toBe(true)
  })

  it('detects Indian PAN card', () => {
    const matches = detectPII('PAN: ABCDE1234F')
    expect(matches.some((m) => m.type === 'pan')).toBe(true)
  })

  it('detects full names with title prefix', () => {
    const matches = detectPII('Dr John Smith was consulted')
    expect(matches.some((m) => m.type === 'full_name')).toBe(true)
  })

  it('detects date-of-birth patterns', () => {
    const matches = detectPII('DOB: 15/08/1990')
    expect(matches.some((m) => m.type === 'date_of_birth')).toBe(true)
  })

  it('detects IP addresses', () => {
    const matches = detectPII('Device IP 192.168.1.100 recorded')
    expect(matches.some((m) => m.type === 'ip_address')).toBe(true)
  })

  it('returns multiple match types for text with several PII items', () => {
    const matches = detectPII('MRN12345 email: a@b.com +911234567890')
    expect(matches.length).toBeGreaterThan(1)
  })
})

// ---------------------------------------------------------------------------
// hasPII
// ---------------------------------------------------------------------------

describe('hasPII', () => {
  it('returns false for clean text', () => {
    expect(hasPII('Awaiting housekeeping')).toBe(false)
    expect(hasPII('')).toBe(false)
  })

  it('returns true for text containing email', () => {
    expect(hasPII('Send to test@example.com')).toBe(true)
  })

  it('returns true for text with MRN', () => {
    expect(hasPII('UHID: 98765')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// piiRefine (Zod integration)
// ---------------------------------------------------------------------------

describe('piiRefine via Zod superRefine', () => {
  const SafeNotes = z.string().max(500).superRefine(piiRefine)

  it('passes for clinical notes without PII', () => {
    const result = SafeNotes.safeParse('Needs deep cleaning before patient arrival')
    expect(result.success).toBe(true)
  })

  it('rejects notes containing email address', () => {
    const result = SafeNotes.safeParse('Contact nurse@ward3.org')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/patient-identifiable/i)
    }
  })

  it('rejects notes containing phone number', () => {
    const result = SafeNotes.safeParse('Call 9876543210 for update')
    expect(result.success).toBe(false)
  })

  it('rejects notes with MRN', () => {
    const result = SafeNotes.safeParse('Patient MRN99001 transferred')
    expect(result.success).toBe(false)
  })

  it('passes empty string (optional field)', () => {
    const result = SafeNotes.safeParse('')
    expect(result.success).toBe(true)
  })

  it('error message lists the detected PII type', () => {
    const result = SafeNotes.safeParse('Email: doctor@hospital.in')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('email')
    }
  })
})
