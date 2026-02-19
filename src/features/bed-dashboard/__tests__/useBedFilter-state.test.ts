import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBedFilter } from '../hooks/useBedFilter'
import type { BedWithElapsedTime } from '../types/bed'

// ── Helpers ────────────────────────────────────────────────────────────────

function makeBed(
  id: string,
  isDelayed: boolean,
  elapsedTimeMs: number | null
): BedWithElapsedTime {
  return {
    id,
    bedNumber: `ER-${id}`,
    currentStageId: '1',
    currentStage: null,
    patientStartTime: new Date(),
    lastStageChange: null,
    isOccupied: true,
    isActive: true,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    elapsedTimeMs,
    isDelayed,
    isDispositionBottleneck: false,
    dispositionElapsedMs: null,
    dispositionDelayReason: null,
    dispositionDelayLogId: null,
  }
}

const SESSION_KEY = 'ewtcs:bedFilter'

const BEDS: BedWithElapsedTime[] = [
  makeBed('01', true, 12_600_000),  // 3h 30m — delayed
  makeBed('02', false, 2_700_000),  // 45m     — on time
  makeBed('03', true, 18_000_000),  // 5h      — delayed (longest)
  makeBed('04', false, null),       // empty
  makeBed('05', true, 10_800_000),  // 3h      — delayed
]

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  sessionStorage.clear()
  vi.clearAllMocks()
})

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useBedFilter — state and sorting', () => {
  describe('Initial state', () => {
    it('should return all beds with no filter or sort active', () => {
      const { result } = renderHook(() => useBedFilter(BEDS))

      expect(result.current.showDelayedOnly).toBe(false)
      expect(result.current.sortOrder).toBe('none')
      expect(result.current.displayedBeds).toHaveLength(BEDS.length)
      expect(result.current.isFilterActive).toBe(false)
    })

    it('should restore showDelayedOnly from sessionStorage', () => {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ showDelayedOnly: true, sortOrder: 'none' }))

      const { result } = renderHook(() => useBedFilter(BEDS))

      expect(result.current.showDelayedOnly).toBe(true)
    })

    it('should restore sortOrder from sessionStorage', () => {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ showDelayedOnly: false, sortOrder: 'desc' }))

      const { result } = renderHook(() => useBedFilter(BEDS))

      expect(result.current.sortOrder).toBe('desc')
    })

    it('should fall back to defaults when sessionStorage contains invalid JSON', () => {
      sessionStorage.setItem(SESSION_KEY, 'not-valid-json{{{')

      const { result } = renderHook(() => useBedFilter(BEDS))

      expect(result.current.showDelayedOnly).toBe(false)
      expect(result.current.sortOrder).toBe('none')
    })
  })

  describe('AC: Show Delayed Only filter', () => {
    it('should show only delayed beds after toggleDelayedFilter', () => {
      const { result } = renderHook(() => useBedFilter(BEDS))

      act(() => { result.current.toggleDelayedFilter() })

      const delayed = result.current.displayedBeds
      expect(delayed.every((b) => b.isDelayed)).toBe(true)
      expect(delayed).toHaveLength(3) // beds 01, 03, 05
    })

    it('should return all beds when toggled back off', () => {
      const { result } = renderHook(() => useBedFilter(BEDS))

      act(() => { result.current.toggleDelayedFilter() })
      act(() => { result.current.toggleDelayedFilter() })

      expect(result.current.displayedBeds).toHaveLength(BEDS.length)
    })

    it('should mark isFilterActive as true when delayed filter is on', () => {
      const { result } = renderHook(() => useBedFilter(BEDS))

      act(() => { result.current.toggleDelayedFilter() })

      expect(result.current.isFilterActive).toBe(true)
    })
  })

  describe('AC: Sort by delay duration', () => {
    it('should sort all beds longest wait first when sortOrder is desc', () => {
      const { result } = renderHook(() => useBedFilter(BEDS))

      act(() => { result.current.toggleSortOrder() })

      expect(result.current.sortOrder).toBe('desc')
      const ids = result.current.displayedBeds.map((b) => b.id)
      // Expected order by elapsedTimeMs desc: 03(18M) → 01(12.6M) → 05(10.8M) → 02(2.7M) → 04(null=0)
      expect(ids).toEqual(['03', '01', '05', '02', '04'])
    })

    it('should toggle sort off on second press', () => {
      const { result } = renderHook(() => useBedFilter(BEDS))

      act(() => { result.current.toggleSortOrder() })
      act(() => { result.current.toggleSortOrder() })

      expect(result.current.sortOrder).toBe('none')
    })

    it('should mark isFilterActive as true when sort is active', () => {
      const { result } = renderHook(() => useBedFilter(BEDS))

      act(() => { result.current.toggleSortOrder() })

      expect(result.current.isFilterActive).toBe(true)
    })

    it('should sort only the delayed subset when both filter and sort are active', () => {
      const { result } = renderHook(() => useBedFilter(BEDS))

      act(() => { result.current.toggleDelayedFilter() })
      act(() => { result.current.toggleSortOrder() })

      const ids = result.current.displayedBeds.map((b) => b.id)
      // Delayed beds only, sorted desc: 03(18M) → 01(12.6M) → 05(10.8M)
      expect(ids).toEqual(['03', '01', '05'])
    })
  })
})
