// useAnalyticsData - Custom hook for StageAnalyticsView data loading
// Extracted from StageAnalyticsView.tsx to stay under the 200-line limit.

import { useState, useCallback, useEffect } from 'react'
import {
  fetchStageDurationStats,
  fetchTriageStateDurationStats,
} from '../actions/analytics-stage-actions'
import {
  fetchLongestWaitingBeds,
  fetchAnalyticsSummary,
  fetchBedStageTimeline,
} from '../actions/analytics-actions'
import { fetchDelayAttributionStats } from '../actions/delay-attribution-actions'
import {
  fetchErTatSummary,
  fetchErCleaningTatSummary,
  fetchTriageTatSummary,
  fetchTriageCleaningTatSummary,
} from '../actions/tat-actions'
import type {
  StageDurationStats,
  BedStageTimeline,
  DelayAttributionStats,
  DurationMetricSummary,
} from '../lib/stage-analytics'
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
  erStageDurationStats: StageDurationStats[] | null
  triageStateDurationStats: StageDurationStats[] | null
  longestWaitingBeds: WaitingBed[]
  summary: SummaryData | null
  attributionStats: DelayAttributionStats[] | null
  erTatSummary: DurationMetricSummary | null
  triageTatSummary: DurationMetricSummary | null
  erCleaningTatSummary: DurationMetricSummary | null
  triageCleaningTatSummary: DurationMetricSummary | null
  bedTimeline: BedStageTimeline | null
  selectedBedId: string | null
  loading: boolean
  error: string | null
  setSelectedBedId: (id: string | null) => void
  reload: () => void
}

export function useAnalyticsData(): AnalyticsData {
  const [erStageDurationStats, setErStageDurationStats] = useState<StageDurationStats[] | null>(null)
  const [triageStateDurationStats, setTriageStateDurationStats] = useState<StageDurationStats[] | null>(null)
  const [longestWaitingBeds, setLongestWaitingBeds] = useState<WaitingBed[]>([])
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [attributionStats, setAttributionStats] = useState<DelayAttributionStats[] | null>(null)
  const [erTatSummary, setErTatSummary] = useState<DurationMetricSummary | null>(null)
  const [triageTatSummary, setTriageTatSummary] = useState<DurationMetricSummary | null>(null)
  const [erCleaningTatSummary, setErCleaningTatSummary] = useState<DurationMetricSummary | null>(null)
  const [triageCleaningTatSummary, setTriageCleaningTatSummary] = useState<DurationMetricSummary | null>(null)
  const [bedTimeline, setBedTimeline] = useState<BedStageTimeline | null>(null)
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [
        erStatsResult,
        triageStatsResult,
        waitingResult,
        summaryResult,
        attributionResult,
        erTatResult,
        triageTatResult,
        erCleaningResult,
        triageCleaningResult,
      ] = await Promise.all([
        fetchStageDurationStats(),
        fetchTriageStateDurationStats(),
        fetchLongestWaitingBeds(10),
        fetchAnalyticsSummary(),
        fetchDelayAttributionStats(),
        fetchErTatSummary(),
        fetchTriageTatSummary(),
        fetchErCleaningTatSummary(),
        fetchTriageCleaningTatSummary(),
      ])

      if (!erStatsResult.success) throw new Error(erStatsResult.error)
      if (!triageStatsResult.success) throw new Error(triageStatsResult.error)
      if (!waitingResult.success) throw new Error(waitingResult.error)
      if (!summaryResult.success) throw new Error(summaryResult.error)

      setErStageDurationStats(erStatsResult.data ?? [])
      setTriageStateDurationStats(triageStatsResult.data ?? [])
      setLongestWaitingBeds(
        (waitingResult.data ?? []).map((bed) => ({
          ...bed,
          transitionTime: new Date(bed.transitionTime),
        }))
      )
      setSummary(summaryResult.data ?? null)
      setAttributionStats(attributionResult.success ? (attributionResult.data ?? null) : null)
      setErTatSummary(erTatResult.success ? (erTatResult.data ?? null) : null)
      setTriageTatSummary(triageTatResult.success ? (triageTatResult.data ?? null) : null)
      setErCleaningTatSummary(erCleaningResult.success ? (erCleaningResult.data ?? null) : null)
      setTriageCleaningTatSummary(
        triageCleaningResult.success ? (triageCleaningResult.data ?? null) : null
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load analytics'
      setError(message)
      logger.error('Failed to load analytics', error as Error)
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
      } catch (error) {
        logger.error('Failed to load bed timeline', error as Error)
      }
    }

    void loadTimeline()
  }, [selectedBedId])

  return {
    erStageDurationStats,
    triageStateDurationStats,
    longestWaitingBeds,
    summary,
    attributionStats,
    erTatSummary,
    triageTatSummary,
    erCleaningTatSummary,
    triageCleaningTatSummary,
    bedTimeline,
    selectedBedId,
    loading,
    error,
    setSelectedBedId,
    reload,
  }
}
