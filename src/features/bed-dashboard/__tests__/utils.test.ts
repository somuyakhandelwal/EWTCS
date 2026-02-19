import { describe, it, expect } from 'vitest'
import {
  formatElapsedTime,
  getDelayColorClasses,
  calculateOccupancyPercentage,
  getBedStatistics,
  isCriticalStage,
} from '../lib/utils'

describe('formatElapsedTime', () => {
  describe('Edge Cases', () => {
    it('should return "N/A" for null input', () => {
      expect(formatElapsedTime(null)).toBe('N/A')
    })

    it('should return "N/A" for negative milliseconds', () => {
      expect(formatElapsedTime(-1000)).toBe('N/A')
    })

    it('should return "< 1m" for 0 milliseconds', () => {
      expect(formatElapsedTime(0)).toBe('< 1m')
    })

    it('should return "< 1m" for milliseconds less than 1 minute', () => {
      expect(formatElapsedTime(59999)).toBe('< 1m')
    })
  })

  describe('Minutes Only', () => {
    it('should format 1 minute correctly', () => {
      expect(formatElapsedTime(60000)).toBe('1m')
    })

    it('should format 5 minutes correctly', () => {
      expect(formatElapsedTime(300000)).toBe('5m')
    })

    it('should format 30 minutes correctly', () => {
      expect(formatElapsedTime(1800000)).toBe('30m')
    })

    it('should format 59 minutes correctly', () => {
      expect(formatElapsedTime(3540000)).toBe('59m')
    })
  })

  describe('Hours Only', () => {
    it('should format 1 hour correctly', () => {
      expect(formatElapsedTime(3600000)).toBe('1h')
    })

    it('should format 2 hours correctly', () => {
      expect(formatElapsedTime(7200000)).toBe('2h')
    })

    it('should format 3 hours (delay threshold) correctly', () => {
      expect(formatElapsedTime(10800000)).toBe('3h')
    })

    it('should format 24 hours (1 day) correctly', () => {
      expect(formatElapsedTime(86400000)).toBe('24h')
    })

    it('should format 48 hours (2 days) correctly', () => {
      expect(formatElapsedTime(172800000)).toBe('48h')
    })
  })

  describe('Hours and Minutes', () => {
    it('should format 1 hour 1 minute correctly', () => {
      expect(formatElapsedTime(3660000)).toBe('1h 1m')
    })

    it('should format 1 hour 15 minutes correctly', () => {
      expect(formatElapsedTime(4500000)).toBe('1h 15m')
    })

    it('should format 1 hour 30 minutes correctly', () => {
      expect(formatElapsedTime(5400000)).toBe('1h 30m')
    })

    it('should format 2 hours 45 minutes correctly (common example)', () => {
      expect(formatElapsedTime(9900000)).toBe('2h 45m')
    })

    it('should format 3 hours 15 minutes correctly (delay example)', () => {
      expect(formatElapsedTime(11700000)).toBe('3h 15m')
    })

    it('should format 46 hours correctly (multi-day patient)', () => {
      expect(formatElapsedTime(165600000)).toBe('46h')
    })

    it('should format 46 hours 30 minutes correctly', () => {
      expect(formatElapsedTime(167400000)).toBe('46h 30m')
    })
  })

  describe('Rounding Behavior', () => {
    it('should round down minutes correctly', () => {
      // 1 minute 59 seconds = 119 seconds
      expect(formatElapsedTime(119000)).toBe('1m')
    })

    it('should round down hours correctly', () => {
      // 1 hour 59 minutes 59 seconds = 7199 seconds
      expect(formatElapsedTime(7199000)).toBe('1h 59m')
    })

    it('should handle boundary between minutes and hours', () => {
      // 59 minutes 59 seconds
      expect(formatElapsedTime(3599000)).toBe('59m')
      // 60 minutes
      expect(formatElapsedTime(3600000)).toBe('1h')
    })
  })

  describe('Real-world Scenarios', () => {
    it('patient just admitted (10 seconds ago)', () => {
      expect(formatElapsedTime(10000)).toBe('< 1m')
    })

    it('patient in triage (2 minutes)', () => {
      expect(formatElapsedTime(120000)).toBe('2m')
    })

    it('patient in registration (15 minutes)', () => {
      expect(formatElapsedTime(900000)).toBe('15m')
    })

    it('patient in examination (45 minutes)', () => {
      expect(formatElapsedTime(2700000)).toBe('45m')
    })

    it('patient in waiting (1 hour 30 minutes)', () => {
      expect(formatElapsedTime(5400000)).toBe('1h 30m')
    })

    it('patient approaching delay threshold (2 hours 50 minutes)', () => {
      expect(formatElapsedTime(10200000)).toBe('2h 50m')
    })

    it('patient at delay threshold (3 hours exactly)', () => {
      expect(formatElapsedTime(10800000)).toBe('3h')
    })

    it('patient delayed (3 hours 30 minutes)', () => {
      expect(formatElapsedTime(12600000)).toBe('3h 30m')
    })

    it('patient heavily delayed (5 hours 15 minutes)', () => {
      expect(formatElapsedTime(18900000)).toBe('5h 15m')
    })

    it('overnight patient (24 hours)', () => {
      expect(formatElapsedTime(86400000)).toBe('24h')
    })
  })

  describe('Acceptance Criteria Validation', () => {
    it('AC-1: should display time in "Xh Ym" format', () => {
      // Pattern: hours + minutes format
      const result = formatElapsedTime(9900000) // 2h 45m
      expect(result).toMatch(/^\d+h\s\d+m$/)
    })

    it('AC-1: should display time in "Xm" format when only minutes', () => {
      const result = formatElapsedTime(300000) // 5m
      expect(result).toMatch(/^\d+m$/)
    })

    it('AC-1: should display time in "Xh" format when only hours', () => {
      const result = formatElapsedTime(3600000) // 1h
      expect(result).toMatch(/^\d+h$/)
    })

    it('AC-5: format should be consistent across all calls', () => {
      // Same input should always produce same output
      expect(formatElapsedTime(9900000)).toBe(formatElapsedTime(9900000))
      expect(formatElapsedTime(300000)).toBe(formatElapsedTime(300000))
      expect(formatElapsedTime(3600000)).toBe(formatElapsedTime(3600000))
    })
  })

  describe('Performance', () => {
    it('should calculate format in < 1ms', () => {
      const start = performance.now()
      formatElapsedTime(9900000)
      const end = performance.now()
      expect(end - start).toBeLessThan(1)
    })

    it('should handle 1000 calls efficiently', () => {
      const start = performance.now()
      for (let i = 0; i < 1000; i++) {
        formatElapsedTime(9900000)
      }
      const end = performance.now()
      expect(end - start).toBeLessThan(100) // Should be < 100ms for 1000 calls
    })
  })
})

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

// ─────────────────────────────────────────────────────────────────────────────
// getBedStatistics
// ─────────────────────────────────────────────────────────────────────────────
describe('getBedStatistics', () => {
  it('returns all zeros and null average for empty array', () => {
    const stats = getBedStatistics([])
    expect(stats.total).toBe(0)
    expect(stats.occupied).toBe(0)
    expect(stats.available).toBe(0)
    expect(stats.delayed).toBe(0)
    expect(stats.occupancyPercentage).toBe(0)
    expect(stats.averageElapsedTimeMs).toBeNull()
  })

  it('counts total beds correctly', () => {
    const beds = [
      { isOccupied: true, isDelayed: false, elapsedTimeMs: 3_600_000 },
      { isOccupied: false, isDelayed: false, elapsedTimeMs: null },
      { isOccupied: true, isDelayed: true, elapsedTimeMs: 7_200_000 },
    ]
    expect(getBedStatistics(beds).total).toBe(3)
  })

  it('occupied + available = total', () => {
    const beds = [
      { isOccupied: true, isDelayed: false, elapsedTimeMs: 3_600_000 },
      { isOccupied: false, isDelayed: false, elapsedTimeMs: null },
      { isOccupied: false, isDelayed: false, elapsedTimeMs: null },
    ]
    const stats = getBedStatistics(beds)
    expect(stats.occupied + stats.available).toBe(stats.total)
  })

  it('counts delayed beds correctly', () => {
    const beds = [
      { isOccupied: true, isDelayed: true, elapsedTimeMs: 12_600_000 },
      { isOccupied: true, isDelayed: true, elapsedTimeMs: 14_400_000 },
      { isOccupied: true, isDelayed: false, elapsedTimeMs: 3_600_000 },
      { isOccupied: false, isDelayed: false, elapsedTimeMs: null },
    ]
    expect(getBedStatistics(beds).delayed).toBe(2)
  })

  it('averageElapsedTimeMs is null when no occupied beds have a time', () => {
    const beds = [
      { isOccupied: false, isDelayed: false, elapsedTimeMs: null },
      { isOccupied: false, isDelayed: false, elapsedTimeMs: null },
    ]
    expect(getBedStatistics(beds).averageElapsedTimeMs).toBeNull()
  })

  it('averageElapsedTimeMs is null when elapsedTimeMs is null on occupied beds', () => {
    const beds = [{ isOccupied: true, isDelayed: false, elapsedTimeMs: null }]
    expect(getBedStatistics(beds).averageElapsedTimeMs).toBeNull()
  })

  it('calculates average elapsed time across occupied beds with times', () => {
    const beds = [
      { isOccupied: true, isDelayed: false, elapsedTimeMs: 3_600_000 },
      { isOccupied: true, isDelayed: false, elapsedTimeMs: 7_200_000 },
      { isOccupied: false, isDelayed: false, elapsedTimeMs: null }, // excluded
    ]
    // average = (3_600_000 + 7_200_000) / 2 = 5_400_000
    expect(getBedStatistics(beds).averageElapsedTimeMs).toBe(5_400_000)
  })

  it('occupancyPercentage is consistent with calculateOccupancyPercentage', () => {
    const beds = [
      { isOccupied: true, isDelayed: false, elapsedTimeMs: 3_600_000 },
      { isOccupied: true, isDelayed: true, elapsedTimeMs: 7_200_000 },
      { isOccupied: false, isDelayed: false, elapsedTimeMs: null },
      { isOccupied: false, isDelayed: false, elapsedTimeMs: null },
    ]
    expect(getBedStatistics(beds).occupancyPercentage).toBe(50)
  })

  it('all 12 beds occupied → 100% occupancy, available=0', () => {
    const beds = Array.from({ length: 12 }, () => ({
      isOccupied: true,
      isDelayed: false,
      elapsedTimeMs: 1_800_000,
    }))
    const stats = getBedStatistics(beds)
    expect(stats.occupancyPercentage).toBe(100)
    expect(stats.available).toBe(0)
    expect(stats.averageElapsedTimeMs).toBe(1_800_000)
  })
})

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
