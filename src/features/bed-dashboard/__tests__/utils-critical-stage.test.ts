import { describe, it, expect } from 'vitest'
import { isCriticalStage } from '../lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// isCriticalStage
// ─────────────────────────────────────────────────────────────────────────────
describe('isCriticalStage', () => {
  describe('Critical stage names', () => {
    it('"Discharge" is critical (case-insensitive)', () => {
      expect(isCriticalStage('Discharge')).toBe(true)
      expect(isCriticalStage('discharge')).toBe(true)
      expect(isCriticalStage('DISCHARGE')).toBe(true)
    })

    it('"Discharge Process" is critical (contains keyword)', () => {
      expect(isCriticalStage('Discharge Process')).toBe(true)
    })

    it('"Code Blue" is critical', () => {
      expect(isCriticalStage('Code Blue')).toBe(true)
      expect(isCriticalStage('code blue')).toBe(true)
    })

    it('"Critical Care" is critical', () => {
      expect(isCriticalStage('Critical Care')).toBe(true)
    })

    it('"Deceased" is critical', () => {
      expect(isCriticalStage('Deceased')).toBe(true)
      expect(isCriticalStage('deceased')).toBe(true)
    })

    it('"Terminal Stage" is critical', () => {
      expect(isCriticalStage('Terminal Stage')).toBe(true)
    })

    it('"Transfer to ICU" is critical', () => {
      expect(isCriticalStage('Transfer to ICU')).toBe(true)
      expect(isCriticalStage('transfer')).toBe(true)
    })
  })

  describe('Non-critical stage names', () => {
    it('"Triage" is not critical', () => {
      expect(isCriticalStage('Triage')).toBe(false)
    })

    it('"Registration" is not critical', () => {
      expect(isCriticalStage('Registration')).toBe(false)
    })

    it('"Doctor Assessment" is not critical', () => {
      expect(isCriticalStage('Doctor Assessment')).toBe(false)
    })

    it('"Treatment" is not critical', () => {
      expect(isCriticalStage('Treatment')).toBe(false)
    })

    it('"Observation" is not critical', () => {
      expect(isCriticalStage('Observation')).toBe(false)
    })

    it('"Decision Made" is not critical', () => {
      expect(isCriticalStage('Decision Made')).toBe(false)
    })

    it('"Waiting" is not critical', () => {
      expect(isCriticalStage('Waiting')).toBe(false)
    })
  })

  describe('Edge cases', () => {
    it('empty string returns false', () => {
      expect(isCriticalStage('')).toBe(false)
    })

    it('partial keyword match is still critical — "pre-discharge planning"', () => {
      expect(isCriticalStage('pre-discharge planning')).toBe(true)
    })

    it('keyword in middle of word triggers match — "transferred"', () => {
      expect(isCriticalStage('transferred')).toBe(true)
    })
  })
})
