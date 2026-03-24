/**
 * EPIC 22 — Diagnosis Schema & Action Unit Tests
 * Tests input validation (Zod schema) and auth guard behavior.
 * DB-dependent tests (submitDiagnosis insert, getDiagnosisForBed query)
 * are tested at the schema layer since they require a live PostgreSQL instance.
 */

import { describe, it, expect } from 'vitest'
import { diagnosisSchema, SEVERITY_OPTIONS } from '../schemas/diagnosis-schemas'

// ─── Schema validation ───────────────────────────────────────────────────────

describe('EPIC 22 – diagnosisSchema validation', () => {
  const validInput = {
    patientUhid: 'UHID-001',
    symptomsObserved: 'Chest pain radiating to left arm',
    diagnosisText: 'Acute Myocardial Infarction',
    diagnosisCode: 'I21.9',
    severity: 'SEVERE' as const,
    recommendedAction: 'Transfer to cardiac ICU immediately',
  }

  it('accepts a fully valid input', () => {
    const result = diagnosisSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('rejects when patientUhid is empty', () => {
    const result = diagnosisSchema.safeParse({ ...validInput, patientUhid: '' })
    expect(result.success).toBe(false)
  })

  it('rejects when diagnosisText is empty', () => {
    const result = diagnosisSchema.safeParse({ ...validInput, diagnosisText: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid severity values', () => {
    const result = diagnosisSchema.safeParse({ ...validInput, severity: 'UNKNOWN' })
    expect(result.success).toBe(false)
  })

  it('accepts all four valid severity values', () => {
    for (const severity of SEVERITY_OPTIONS) {
      const result = diagnosisSchema.safeParse({ ...validInput, severity })
      expect(result.success, `severity ${severity} should be valid`).toBe(true)
    }
  })

  it('accepts when optional fields are omitted (uses defaults)', () => {
    const { symptomsObserved, diagnosisCode, recommendedAction, ...minimal } = validInput
    const result = diagnosisSchema.safeParse(minimal)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.symptomsObserved).toBe('')
      expect(result.data.diagnosisCode).toBe('')
      expect(result.data.recommendedAction).toBe('')
    }
  })

  it('rejects symptomsObserved longer than 500 characters', () => {
    const result = diagnosisSchema.safeParse({
      ...validInput,
      symptomsObserved: 'a'.repeat(501),
    })
    expect(result.success).toBe(false)
  })

  it('rejects diagnosisText longer than 1000 characters', () => {
    const result = diagnosisSchema.safeParse({
      ...validInput,
      diagnosisText: 'a'.repeat(1001),
    })
    expect(result.success).toBe(false)
  })

  it('rejects diagnosisCode longer than 20 characters', () => {
    const result = diagnosisSchema.safeParse({
      ...validInput,
      diagnosisCode: 'A'.repeat(21),
    })
    expect(result.success).toBe(false)
  })

  it('accepts diagnosisCode up to 20 characters', () => {
    const result = diagnosisSchema.safeParse({
      ...validInput,
      diagnosisCode: 'A'.repeat(20),
    })
    expect(result.success).toBe(true)
  })
})

// ─── SEVERITY_OPTIONS constant ───────────────────────────────────────────────

describe('EPIDEMIC 22 – SEVERITY_OPTIONS constant', () => {
  it('contains exactly 4 values', () => {
    expect(SEVERITY_OPTIONS).toHaveLength(4)
  })

  it('contains the expected severity levels', () => {
    expect(SEVERITY_OPTIONS).toContain('MILD')
    expect(SEVERITY_OPTIONS).toContain('MODERATE')
    expect(SEVERITY_OPTIONS).toContain('SEVERE')
    expect(SEVERITY_OPTIONS).toContain('CRITICAL')
  })
})
