import { describe, it, expect } from 'vitest'
import {
  getDelayColorClasses,
  calculateOccupancyPercentage,
} from '../lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// getDelayColorClasses
// ─────────────────────────────────────────────────────────────────────────────
describe('getDelayColorClasses', () => {
  describe('Delayed beds', () => {
    it('returns red background for delayed bed', () => {
      expect(getDelayColorClasses(true).bg).toBe('bg-red-900/50')
    })

    it('returns red text for delayed bed', () => {
      expect(getDelayColorClasses(true).text).toBe('text-red-300')
    })

    it('returns red border for delayed bed', () => {
      expect(getDelayColorClasses(true).border).toBe('border-red-700')
    })

    it('all three tokens are present for delayed=true', () => {
      const classes = getDelayColorClasses(true)
      expect(classes.bg).toBeTruthy()
      expect(classes.text).toBeTruthy()
      expect(classes.border).toBeTruthy()
    })
  })

  describe('On-time beds', () => {
    it('returns zinc background for on-time bed', () => {
      expect(getDelayColorClasses(false).bg).toBe('bg-zinc-800')
    })

    it('returns zinc text for on-time bed', () => {
      expect(getDelayColorClasses(false).text).toBe('text-zinc-300')
    })

    it('returns zinc border for on-time bed', () => {
      expect(getDelayColorClasses(false).border).toBe('border-zinc-700')
    })

    it('all three tokens are present for delayed=false', () => {
      const classes = getDelayColorClasses(false)
      expect(classes.bg).toBeTruthy()
      expect(classes.text).toBeTruthy()
      expect(classes.border).toBeTruthy()
    })
  })

  describe('Return shape', () => {
    it('always returns an object with bg, text, border keys', () => {
      for (const flag of [true, false]) {
        const result = getDelayColorClasses(flag)
        expect(Object.keys(result)).toEqual(expect.arrayContaining(['bg', 'text', 'border']))
      }
    })

    it('delayed and on-time classes are different from each other', () => {
      const delayed = getDelayColorClasses(true)
      const onTime = getDelayColorClasses(false)
      expect(delayed.bg).not.toBe(onTime.bg)
      expect(delayed.text).not.toBe(onTime.text)
      expect(delayed.border).not.toBe(onTime.border)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// calculateOccupancyPercentage
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateOccupancyPercentage', () => {
  it('returns 0 for empty array', () => {
    expect(calculateOccupancyPercentage([])).toBe(0)
  })

  it('returns 0 when no beds are occupied', () => {
    const beds = [{ isOccupied: false }, { isOccupied: false }]
    expect(calculateOccupancyPercentage(beds)).toBe(0)
  })

  it('returns 100 when all beds are occupied', () => {
    const beds = [{ isOccupied: true }, { isOccupied: true }, { isOccupied: true }]
    expect(calculateOccupancyPercentage(beds)).toBe(100)
  })

  it('returns 50 for half-occupied ward (4/8)', () => {
    const beds = Array.from({ length: 8 }, (_, i) => ({ isOccupied: i < 4 }))
    expect(calculateOccupancyPercentage(beds)).toBe(50)
  })

  it('rounds to nearest integer — 1/3 beds occupied rounds correctly', () => {
    const beds = [{ isOccupied: true }, { isOccupied: false }, { isOccupied: false }]
    expect(calculateOccupancyPercentage(beds)).toBe(33)
  })

  it('rounds to nearest integer — 2/3 beds occupied rounds correctly', () => {
    const beds = [{ isOccupied: true }, { isOccupied: true }, { isOccupied: false }]
    expect(calculateOccupancyPercentage(beds)).toBe(67)
  })

  it('handles single occupied bed', () => {
    expect(calculateOccupancyPercentage([{ isOccupied: true }])).toBe(100)
  })

  it('handles single unoccupied bed', () => {
    expect(calculateOccupancyPercentage([{ isOccupied: false }])).toBe(0)
  })

  it('returns a number between 0 and 100 for any valid input', () => {
    const beds = Array.from({ length: 12 }, (_, i) => ({ isOccupied: i < 7 }))
    const result = calculateOccupancyPercentage(beds)
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(100)
  })
})
