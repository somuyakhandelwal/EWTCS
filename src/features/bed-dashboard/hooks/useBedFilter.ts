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
  searchQuery: string
  displayedBeds: BedWithElapsedTime[]
  isFilterActive: boolean
  toggleDelayedFilter: () => void
  toggleSortOrder: () => void
  setSearchQuery: (query: string) => void
  clearFilter: () => void
}

/**
 * Manages bed filter and sort state for the dashboard.
 * State persists for the duration of the browser session via sessionStorage.
 *
 * AC: Search by bed/status, Show Delayed Only filter, Sort by delay duration, Session persistence, Clear filter
 */
export function useBedFilter(beds: BedWithElapsedTime[]): UseBedFilterResult {
  const [showDelayedOnly, setShowDelayedOnly] = useState<boolean>(
    () => loadFromSession().showDelayedOnly
  )
  const [sortOrder, setSortOrder] = useState<SortOrder>(
    () => loadFromSession().sortOrder
  )
  const [searchQuery, setSearchQuery] = useState('')

  // Persist to sessionStorage whenever filter/sort state changes
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ showDelayedOnly, sortOrder }))
    } catch {
      // sessionStorage unavailable — degrade gracefully
    }
  }, [showDelayedOnly, sortOrder])

  const displayedBeds = useMemo(() => {
    // 1. Initial filter (Delayed Only)
    let filtered = showDelayedOnly ? beds.filter((b) => b.isDelayed) : beds

    // 2. Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(bed =>
        bed.bedNumber.toLowerCase().includes(q) ||
        bed.currentStage?.name.toLowerCase().includes(q)
      )
    }

    // 3. Sorting
    if (sortOrder === 'desc') {
      return [...filtered].sort((a, b) => {
        const aMs = a.elapsedTimeMs ?? 0
        const bMs = b.elapsedTimeMs ?? 0
        return bMs - aMs
      })
    }

    return filtered
  }, [beds, showDelayedOnly, sortOrder, searchQuery])

  const isFilterActive = showDelayedOnly || sortOrder !== 'none' || searchQuery !== ''

  const toggleDelayedFilter = useCallback(() => setShowDelayedOnly((prev) => !prev), [])

  const toggleSortOrder = useCallback(
    () => setSortOrder((prev) => (prev === 'none' ? 'desc' : 'none')),
    []
  )

  const clearFilter = useCallback(() => {
    setShowDelayedOnly(false)
    setSortOrder('none')
    setSearchQuery('')
  }, [])

  return {
    showDelayedOnly,
    sortOrder,
    searchQuery,
    displayedBeds,
    isFilterActive,
    toggleDelayedFilter,
    toggleSortOrder,
    setSearchQuery,
    clearFilter,
  }
}
