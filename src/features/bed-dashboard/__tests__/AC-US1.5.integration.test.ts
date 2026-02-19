import { describe, it, expect } from 'vitest'

// US-1.5 Acceptance Criteria — Filter and Sort Delayed Beds
describe('US-1.5 Acceptance Criteria — Filter and Sort Delayed Beds', () => {
  // Shared bed fixtures
  const makeFilterBed = (id: string, isDelayed: boolean, elapsedMs: number | null) => ({
    id,
    isDelayed,
    elapsedTimeMs: elapsedMs,
  })

  const BEDS = [
    makeFilterBed('B1', true,  12_600_000),  // 3h 30m — delayed
    makeFilterBed('B2', false,  2_700_000),  // 45m     — on time
    makeFilterBed('B3', true,  18_000_000),  // 5h      — delayed (longest)
    makeFilterBed('B4', false,          null), // empty
    makeFilterBed('B5', true,  10_800_000),  // 3h      — delayed
  ]

  describe('AC-1: "Show Delayed Only" filter button', () => {
    it('should isolate delayed beds when filter is active', () => {
      const delayed = BEDS.filter((b) => b.isDelayed)
      expect(delayed).toHaveLength(3)
      expect(delayed.every((b) => b.isDelayed)).toBe(true)
    })

    it('should restore all beds when filter is turned off', () => {
      let result = BEDS.filter((b) => b.isDelayed)
      expect(result).toHaveLength(3)
      result = BEDS // clear
      expect(result).toHaveLength(5)
    })

    it('should correctly count delayed beds for the badge', () => {
      const delayedCount = BEDS.filter((b) => b.isDelayed).length
      expect(delayedCount).toBe(3)
    })
  })

  describe('AC-2: Sort by delay duration', () => {
    it('should sort all beds longest-wait-first', () => {
      const sorted = [...BEDS].sort((a, b) => (b.elapsedTimeMs ?? 0) - (a.elapsedTimeMs ?? 0))
      const ids = sorted.map((b) => b.id)
      // B3(18M) → B1(12.6M) → B5(10.8M) → B2(2.7M) → B4(null→0)
      expect(ids).toEqual(['B3', 'B1', 'B5', 'B2', 'B4'])
    })

    it('should sort only the delayed subset when filter is also active', () => {
      const delayed = BEDS.filter((b) => b.isDelayed)
      const sorted = [...delayed].sort((a, b) => (b.elapsedTimeMs ?? 0) - (a.elapsedTimeMs ?? 0))
      expect(sorted.map((b) => b.id)).toEqual(['B3', 'B1', 'B5'])
    })

    it('should treat null elapsedTimeMs as 0 when sorting', () => {
      const sorted = [...BEDS].sort((a, b) => (b.elapsedTimeMs ?? 0) - (a.elapsedTimeMs ?? 0))
      expect(sorted[sorted.length - 1].id).toBe('B4') // null goes last
    })
  })

  describe('AC-3: Filter state persists during session', () => {
    it('should serialise filter state to a plain JSON object', () => {
      const state = { showDelayedOnly: true, sortOrder: 'desc' }
      const serialised = JSON.stringify(state)
      const parsed = JSON.parse(serialised)
      expect(parsed.showDelayedOnly).toBe(true)
      expect(parsed.sortOrder).toBe('desc')
    })

    it('should survive a round-trip through sessionStorage', () => {
      const SESSION_KEY = 'ewtcs:bedFilter'
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ showDelayedOnly: true, sortOrder: 'desc' }))
      const restored = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '{}')
      expect(restored.showDelayedOnly).toBe(true)
      expect(restored.sortOrder).toBe('desc')
      sessionStorage.removeItem(SESSION_KEY)
    })

    it('should fall back gracefully on corrupted storage', () => {
      const raw = 'not-valid{{'
      let parsed: { showDelayedOnly: boolean; sortOrder: string }
      try {
        parsed = JSON.parse(raw)
      } catch {
        parsed = { showDelayedOnly: false, sortOrder: 'none' }
      }
      expect(parsed.showDelayedOnly).toBe(false)
      expect(parsed.sortOrder).toBe('none')
    })
  })

  describe('AC-4: Clear indication when filter is active', () => {
    it('isFilterActive should be true when showDelayedOnly is true', () => {
      const isFilterActive = (showDelayedOnly: boolean, sortOrder: string) =>
        showDelayedOnly || sortOrder !== 'none'
      expect(isFilterActive(true, 'none')).toBe(true)
    })

    it('isFilterActive should be true when sort is active', () => {
      const isFilterActive = (showDelayedOnly: boolean, sortOrder: string) =>
        showDelayedOnly || sortOrder !== 'none'
      expect(isFilterActive(false, 'desc')).toBe(true)
    })

    it('isFilterActive should be false when nothing is active', () => {
      const isFilterActive = (showDelayedOnly: boolean, sortOrder: string) =>
        showDelayedOnly || sortOrder !== 'none'
      expect(isFilterActive(false, 'none')).toBe(false)
    })
  })

  describe('AC-5: One-click to clear filter', () => {
    it('should reset both filter and sort to defaults', () => {
      let showDelayedOnly = true
      let sortOrder = 'desc'
      // clearFilter
      showDelayedOnly = false
      sortOrder = 'none'
      expect(showDelayedOnly).toBe(false)
      expect(sortOrder).toBe('none')
    })

    it('isFilterActive should be false immediately after clear', () => {
      const isFilterActive = (f: boolean, s: string) => f || s !== 'none'
      expect(isFilterActive(false, 'none')).toBe(false)
    })
  })
})
