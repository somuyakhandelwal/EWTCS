// useLosData — Custom hook for Length-of-Stay analytics
// EPIC 10: Management Report Dashboard
// US-10.x: Average Time Patients Spend in Emergency Ward
//
// Mirrors the useAnalyticsData pattern: fetches summary + trend in parallel,
// exposes loading/error state and a reload() callback.

'use client'

import { useState, useCallback, useEffect } from 'react'
import { fetchLosSummary, fetchLosTrend } from '../actions/los-actions'
import type { LosSummary, LosTrendPoint, LosFilters } from '../lib/los-queries'
import { logger } from '@/shared/config/logger'

export interface UseLosDataReturn {
  summary: LosSummary | null
  trend: LosTrendPoint[]
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Fetches LoS summary and daily trend data based on the provided filters.
 * Re-fetches automatically whenever filters change.
 *
 * @param filters - Date range and optional shift filter
 */
export function useLosData(filters: LosFilters): UseLosDataReturn {
  const [summary, setSummary] = useState<LosSummary | null>(null)
  const [trend, setTrend] = useState<LosTrendPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [summaryResult, trendResult] = await Promise.all([
        fetchLosSummary(filters),
        fetchLosTrend(filters),
      ])

      if (!summaryResult.success) {
        throw new Error(summaryResult.error ?? 'Failed to load LoS summary')
      }
      if (!trendResult.success) {
        throw new Error(trendResult.error ?? 'Failed to load LoS trend')
      }

      setSummary(summaryResult.data ?? null)
      setTrend(trendResult.data ?? [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load LoS data'
      setError(message)
      logger.error('useLosData reload failed', err as Error)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.startDate?.toISOString(),
    filters.endDate?.toISOString(),
    filters.shiftStartTime,
    filters.shiftEndTime,
    filters.shiftCrossesMidnight,
  ])

  useEffect(() => {
    void reload()
  }, [reload])

  return { summary, trend, loading, error, reload }
}
