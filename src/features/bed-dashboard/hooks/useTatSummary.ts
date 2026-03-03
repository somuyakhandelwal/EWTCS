// useTatSummary
// US-2.4: Fetch and cache the Turnaround Time (TAT) summary for the stats bar.
// TAT is non-critical so errors are silently swallowed.

'use client'

import { useState, useEffect } from 'react'
import { fetchTatSummary } from '../actions/tat-actions'
import type { TatSummary } from '../types/bed'

/**
 * Loads the TAT summary for the last `hoursBack` hours on mount.
 * Returns `null` while loading or if no data is available.
 */
export function useTatSummary(hoursBack = 24): TatSummary | null {
  const [tatSummary, setTatSummary] = useState<TatSummary | null>(null)

  useEffect(() => {
    fetchTatSummary(hoursBack)
      .then(r => { if (r.success && r.data) setTatSummary(r.data) })
      .catch(() => { /* TAT is non-critical */ })
  }, [hoursBack])

  return tatSummary
}
