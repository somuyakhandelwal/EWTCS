import { describe, it, expect } from 'vitest'
import { formatElapsedTime } from '../lib/utils'

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
