// US-1.4: Filter and Sort Hook
// DB5-02: Migrated from sessionStorage ('ewtcs:bedFilter') → DB via server action.
// Initial values come from SSR (BedDashboardContainer fetches preferences server-side).
// searchQuery remains ephemeral (not persisted — transient intent, not a preference).

'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import type { BedWithElapsedTime } from '../types/bed'
import { updateUserSettings } from '@/features/bed-dashboard/actions/user-settings-actions'
import type { SortOrder } from '@/shared/types/user-preferences.types'

export type { SortOrder }

const DEBOUNCE_MS = 300

interface InitialFilter {
  showDelayedOnly: boolean
  sortOrder: SortOrder
}

const DEFAULT_FILTER: InitialFilter = {
  showDelayedOnly: false,
  sortOrder: 'none',
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
 * Persistent state (showDelayedOnly, sortOrder) syncs to user_settings in DB.
 * searchQuery is ephemeral — lost on navigation (intentional: it's a transient filter).
 *
 * @param beds - The full list of beds to filter
 * @param initialFilter - Server-fetched initial values (SSR, no flash).
 *   Defaults to { showDelayedOnly: false, sortOrder: 'none' } when not provided.
 */
export function useBedFilter(
  beds: BedWithElapsedTime[],
  initialFilter: InitialFilter = DEFAULT_FILTER
): UseBedFilterResult {
  const [showDelayedOnly, setShowDelayedOnly] = useState<boolean>(
    initialFilter.showDelayedOnly
  )
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialFilter.sortOrder)
  const [searchQuery, setSearchQuery] = useState('')

  // Keep in sync if parent re-renders with a new initial value
  useEffect(() => {
    setShowDelayedOnly(initialFilter.showDelayedOnly)
    setSortOrder(initialFilter.sortOrder)
  }, [initialFilter.showDelayedOnly, initialFilter.sortOrder])

  // Debounced DB write
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)
  const persistToDb = useCallback((patch: Partial<InitialFilter>) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      void updateUserSettings(patch)
    }, DEBOUNCE_MS)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  const displayedBeds = useMemo(() => {
    // 1. Delayed-only filter
    let filtered = showDelayedOnly ? beds.filter((b) => b.isDelayed) : beds

    // 2. Search filter (ephemeral, not persisted)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(bed =>
        bed.bedNumber.toLowerCase().includes(q) ||
        bed.currentStage?.name.toLowerCase().includes(q)
      )
    }

    // 3. Sort by elapsed time descending
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

  const toggleDelayedFilter = useCallback(() => {
    setShowDelayedOnly(prev => {
      const next = !prev
      persistToDb({ showDelayedOnly: next })
      return next
    })
  }, [persistToDb])

  const toggleSortOrder = useCallback(() => {
    setSortOrder(prev => {
      const next: SortOrder = prev === 'none' ? 'desc' : 'none'
      persistToDb({ sortOrder: next })
      return next
    })
  }, [persistToDb])

  const clearFilter = useCallback(() => {
    setShowDelayedOnly(false)
    setSortOrder('none')
    setSearchQuery('')
    persistToDb({ showDelayedOnly: false, sortOrder: 'none' })
  }, [persistToDb])

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
