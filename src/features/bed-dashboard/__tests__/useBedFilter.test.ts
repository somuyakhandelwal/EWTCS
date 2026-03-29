import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBedFilter } from '../hooks/useBedFilter'
import type { BedWithElapsedTime } from '../types/bed'

const { updateUserSettingsMock } = vi.hoisted(() => ({
  updateUserSettingsMock: vi.fn(),
}))

vi.mock('@/features/bed-dashboard/actions/user-settings-actions', () => ({
  updateUserSettings: updateUserSettingsMock,
}))

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
    isTemporary: false,
    isVirtual: false,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    elapsedTimeMs,
    isDelayed,
    isDispositionBottleneck: false,
    dispositionElapsedMs: null,
    dispositionDelayReason: null,
    dispositionDelayLogId: null,
    isEscalated: false,
  }
}

const BEDS: BedWithElapsedTime[] = [
  makeBed('01', true, 12_600_000),  // 3h 30m — delayed
  makeBed('02', false, 2_700_000),  // 45m     — on time
  makeBed('03', true, 18_000_000),  // 5h      — delayed (longest)
  makeBed('04', false, null),       // empty
  makeBed('05', true, 10_800_000),  // 3h      — delayed
]

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// ── Tests — Initial state / Show Delayed Only / Sort → useBedFilter-state.test.ts ────

describe('useBedFilter — clear, persistence and edge cases', () => {
  describe('AC: One-click clear filter', () => {
    it('should reset both filter and sort in one call', () => {
      const { result } = renderHook(() => useBedFilter(BEDS))

      act(() => { result.current.toggleDelayedFilter() })
      act(() => { result.current.toggleSortOrder() })
      act(() => { result.current.clearFilter() })

      expect(result.current.showDelayedOnly).toBe(false)
      expect(result.current.sortOrder).toBe('none')
      expect(result.current.isFilterActive).toBe(false)
      expect(result.current.displayedBeds).toHaveLength(BEDS.length)
    })
  })

  describe('AC: Filter state persists in DB', () => {
    it('should persist delayed filter to DB when filter is toggled', () => {
      const { result } = renderHook(() => useBedFilter(BEDS))

      act(() => { result.current.toggleDelayedFilter() })
      act(() => { vi.advanceTimersByTime(301) })

      expect(updateUserSettingsMock).toHaveBeenCalledTimes(1)
      expect(updateUserSettingsMock).toHaveBeenCalledWith({ showDelayedOnly: true })
    })

    it('should persist sort order to DB when sort is toggled', () => {
      const { result } = renderHook(() => useBedFilter(BEDS))

      act(() => { result.current.toggleSortOrder() })
      act(() => { vi.advanceTimersByTime(301) })

      expect(updateUserSettingsMock).toHaveBeenCalledTimes(1)
      expect(updateUserSettingsMock).toHaveBeenCalledWith({ sortOrder: 'desc' })
    })

    it('should persist cleared filter state to DB after clearFilter', () => {
      const { result } = renderHook(() => useBedFilter(BEDS))

      act(() => { result.current.toggleDelayedFilter() })
      act(() => { result.current.clearFilter() })
      act(() => { vi.advanceTimersByTime(301) })

      expect(updateUserSettingsMock).toHaveBeenCalledTimes(1)
      expect(updateUserSettingsMock).toHaveBeenCalledWith({
        showDelayedOnly: false,
        sortOrder: 'none',
      })
    })
  })

  describe('Edge cases', () => {
    it('should return empty list when delayed filter is on and no beds are delayed', () => {
      const nonDelayedBeds = BEDS.filter((b) => !b.isDelayed)
      const { result } = renderHook(() => useBedFilter(nonDelayedBeds))

      act(() => { result.current.toggleDelayedFilter() })

      expect(result.current.displayedBeds).toHaveLength(0)
    })

    it('should handle an empty beds array', () => {
      const { result } = renderHook(() => useBedFilter([]))

      act(() => { result.current.toggleDelayedFilter() })
      act(() => { result.current.toggleSortOrder() })

      expect(result.current.displayedBeds).toHaveLength(0)
      expect(result.current.isFilterActive).toBe(true)
    })

    it('should treat null elapsedTimeMs as 0 when sorting', () => {
      const beds = [
        makeBed('A', false, null),
        makeBed('B', false, 60_000),
      ]
      const { result } = renderHook(() => useBedFilter(beds))

      act(() => { result.current.toggleSortOrder() })

      const ids = result.current.displayedBeds.map((b) => b.id)
      expect(ids).toEqual(['B', 'A']) // B(60s) before A(null=0)
    })
  })
})
