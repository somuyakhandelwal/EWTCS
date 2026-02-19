// US-1.4: Filter and Sort Hook
// Manages "show delayed only" + "sort by delay" state with session persistence

import { useState, useMemo, useCallback, useEffect } from 'react'
import type { BedWithElapsedTime } from '../types/bed'

export type SortOrder = 'none' | 'desc'

const SESSION_KEY = 'ewtcs:bedFilter'

interface PersistedState {
  showDelayedOnly: boolean
  sortOrder: SortOrder
}

function loadFromSession(): PersistedState {
  if (typeof window === 'undefined') {
    return { showDelayedOnly: false, sortOrder: 'none' }
  }
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return { showDelayedOnly: false, sortOrder: 'none' }
    return JSON.parse(raw) as PersistedState
  } catch {
    return { showDelayedOnly: false, sortOrder: 'none' }
  }
}

export interface UseBedFilterResult {
  showDelayedOnly: boolean
  sortOrder: SortOrder
  displayedBeds: BedWithElapsedTime[]
  isFilterActive: boolean
  toggleDelayedFilter: () => void
  toggleSortOrder: () => void
  clearFilter: () => void
}

/**
 * Manages bed filter and sort state for the dashboard.
 * State persists for the duration of the browser session via sessionStorage.
 *
 * AC: Show Delayed Only filter, Sort by delay duration, Session persistence, Clear filter
 */
export function useBedFilter(beds: BedWithElapsedTime[]): UseBedFilterResult {
  const [showDelayedOnly, setShowDelayedOnly] = useState<boolean>(
    () => loadFromSession().showDelayedOnly
  )
  const [sortOrder, setSortOrder] = useState<SortOrder>(
    () => loadFromSession().sortOrder
  )

  // Persist to sessionStorage whenever filter/sort state changes
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ showDelayedOnly, sortOrder }))
    } catch {
      // sessionStorage unavailable (e.g., incognito with storage blocked) — degrade gracefully
    }
  }, [showDelayedOnly, sortOrder])

  const displayedBeds = useMemo(() => {
    const filtered = showDelayedOnly ? beds.filter((b) => b.isDelayed) : beds

    if (sortOrder === 'desc') {
      return [...filtered].sort((a, b) => {
        const aMs = a.elapsedTimeMs ?? 0
        const bMs = b.elapsedTimeMs ?? 0
        return bMs - aMs // longest delay (highest ms) first
      })
    }

    return filtered
  }, [beds, showDelayedOnly, sortOrder])

  const isFilterActive = showDelayedOnly || sortOrder !== 'none'

  const toggleDelayedFilter = useCallback(() => setShowDelayedOnly((prev) => !prev), [])

  const toggleSortOrder = useCallback(
    () => setSortOrder((prev) => (prev === 'none' ? 'desc' : 'none')),
    []
  )

  const clearFilter = useCallback(() => {
    setShowDelayedOnly(false)
    setSortOrder('none')
  }, [])

  return {
    showDelayedOnly,
    sortOrder,
    displayedBeds,
    isFilterActive,
    toggleDelayedFilter,
    toggleSortOrder,
    clearFilter,
  }
}
