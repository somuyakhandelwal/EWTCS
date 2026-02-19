// useAnalyticsData — Custom hook for StageAnalyticsView data loading
// Epic 3: Time Tracking & Stage Logging
// Extracted from StageAnalyticsView.tsx to stay under the 200-line limit.

import { useState, useCallback, useEffect } from 'react'
import {
  fetchStageDurationStats,
  fetchLongestWaitingBeds,
  fetchAnalyticsSummary,
  fetchBedStageTimeline,
} from '../actions/analytics-actions'
import { fetchDelayAttributionStats } from '../actions/delay-attribution-actions'
import { fetchTATSummary } from '../actions/tat-actions'
import type { StageDurationStats, BedStageTimeline, DelayAttributionStats } from '../lib/stage-analytics'
import type { TATSummary } from '../lib/tat-queries'
import { logger } from '@/shared/config/logger'

type WaitingBed = {
  bedNumber: string
  bedId: string
  currentStageName: string
  currentStageId: string
  waitTimeMs: number
  transitionTime: Date
}

type SummaryData = {
  totalBedsUsed: number
  totalTransitions: number
  averageTimePerPatientMs: number
  averageTransitionsPerPatient: number
  totalPatientsProcessed: number
}

export interface AnalyticsData {
  stageDurationStats: StageDurationStats[] | null
  longestWaitingBeds: WaitingBed[]
  summary: SummaryData | null
  attributionStats: DelayAttributionStats[] | null
  tatSummary: TATSummary | null
  bedTimeline: BedStageTimeline | null
  selectedBedId: string | null
  loading: boolean
  error: string | null
  setSelectedBedId: (id: string | null) => void
  reload: () => void
}

export function useAnalyticsData(): AnalyticsData {
  const [stageDurationStats, setStageDurationStats] = useState<StageDurationStats[] | null>(null)
  const [longestWaitingBeds, setLongestWaitingBeds] = useState<WaitingBed[]>([])
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [attributionStats, setAttributionStats] = useState<DelayAttributionStats[] | null>(null)
  const [tatSummary, setTatSummary] = useState<TATSummary | null>(null)
  const [bedTimeline, setBedTimeline] = useState<BedStageTimeline | null>(null)
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsResult, waitingResult, summaryResult, attributionResult, tatResult] =
        await Promise.all([
          fetchStageDurationStats(),
          fetchLongestWaitingBeds(10),
          fetchAnalyticsSummary(),
          fetchDelayAttributionStats(),
          fetchTATSummary(),
        ])

      if (!statsResult.success) throw new Error(statsResult.error)
      if (!waitingResult.success) throw new Error(waitingResult.error)
      if (!summaryResult.success) throw new Error(summaryResult.error)

      setStageDurationStats(statsResult.data ?? [])
      setLongestWaitingBeds(
        (waitingResult.data ?? []).map((bed) => ({
          ...bed,
          transitionTime: new Date(bed.transitionTime),
        }))
      )
      setSummary(summaryResult.data ?? null)
      setAttributionStats(attributionResult.success ? (attributionResult.data ?? null) : null)
      setTatSummary(tatResult.success ? (tatResult.data ?? null) : null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load analytics'
      setError(message)
      logger.error('Failed to load analytics', err as Error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (!selectedBedId) {
      setBedTimeline(null)
      return
    }
    const loadTimeline = async () => {
      try {
        const result = await fetchBedStageTimeline(selectedBedId)
        if (!result.success) throw new Error(result.error)
        setBedTimeline(result.data ?? null)
      } catch (err) {
        logger.error('Failed to load bed timeline', err as Error)
      }
    }
    void loadTimeline()
  }, [selectedBedId])

  return {
    stageDurationStats,
    longestWaitingBeds,
    summary,
    attributionStats,
    tatSummary,
    bedTimeline,
    selectedBedId,
    loading,
    error,
    setSelectedBedId,
    reload,
  }
}
