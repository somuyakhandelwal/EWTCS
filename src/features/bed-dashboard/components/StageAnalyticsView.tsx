'use client'

// Stage Analytics View Component
// Epic: EPIC 3 - Time Tracking & Stage Logging
// Displays comprehensive analytics about stage transitions and time spent

import { useState, useCallback, useEffect } from 'react'
import { Card } from '@/shared/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  fetchStageDurationStats,
  fetchLongestWaitingBeds,
  fetchAnalyticsSummary,
  exportStageTransitionsAsCSV,
  fetchBedStageTimeline,
} from '../actions/analytics-actions'
import type { StageDurationStats, BedStageTimeline } from '../lib/stage-analytics'
import { logger } from '@/shared/config/logger'
import { cn } from '@/shared/lib/utils'
import { StageAnalyticsHeader } from './StageAnalyticsHeader'
import { StageAnalyticsMetrics } from './StageAnalyticsMetrics'
import { StageAnalyticsDurationAnalysis } from './StageAnalyticsDurationAnalysis'
import { StageAnalyticsWaitingBeds } from './StageAnalyticsWaitingBeds'
import { StageAnalyticsBedTimeline } from './StageAnalyticsBedTimeline'

interface StageAnalyticsViewProps {
  title?: string
  className?: string
}

export function StageAnalyticsView({ title = 'Stage Analytics', className }: StageAnalyticsViewProps) {
  const [stageDurationStats, setStageDurationStats] = useState<StageDurationStats[] | null>(null)
  const [longestWaitingBeds, setLongestWaitingBeds] = useState<
    Array<{
      bedNumber: string
      bedId: string
      currentStageName: string
      currentStageId: string
      waitTimeMs: number
      transitionTime: Date
    }>
  >([])
  const [summary, setSummary] = useState<{
    totalBedsUsed: number
    totalTransitions: number
    averageTimePerPatientMs: number
    averageTransitionsPerPatient: number
    totalPatientsProcessed: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null)
  const [bedTimeline, setBedTimeline] = useState<BedStageTimeline | null>(null)

  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [statsResult, waitingResult, summaryResult] = await Promise.all([
        fetchStageDurationStats(),
        fetchLongestWaitingBeds(10),
        fetchAnalyticsSummary(),
      ])

      if (!statsResult.success) throw new Error(statsResult.error)
      if (!waitingResult.success) throw new Error(waitingResult.error)
      if (!summaryResult.success) throw new Error(summaryResult.error)

      setStageDurationStats(statsResult.data || [])
      setLongestWaitingBeds(
        (waitingResult.data || []).map((bed) => ({
          ...bed,
          transitionTime: new Date(bed.transitionTime),
        }))
      )
      setSummary(summaryResult.data || null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load analytics'
      setError(message)
      logger.error('Failed to load analytics', err as Error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAnalytics()
  }, [loadAnalytics])

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

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const result = await exportStageTransitionsAsCSV()
      if (!result.success) throw new Error(result.error)

      const blob = new Blob([result.data || ''], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `stage-transitions-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      logger.info('Successfully exported stage transitions')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export'
      setError(message)
      logger.error('Failed to export data', err as Error)
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="h-40 rounded-lg bg-zinc-100 animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <div className="pt-6 px-6 pb-6">
          <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
            <AlertCircle className="h-4 w-4" />
            Error Loading Analytics
          </div>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <Button variant="outline" onClick={loadAnalytics} className="mt-2">
            Retry
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      <StageAnalyticsHeader 
        title={title}
        onExportCSV={handleExportCSV}
        exporting={exporting}
      />

      <StageAnalyticsMetrics summary={summary} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <StageAnalyticsDurationAnalysis stats={stageDurationStats} />
        </div>
        <div>
          <StageAnalyticsWaitingBeds
            beds={longestWaitingBeds}
            selectedBedId={selectedBedId}
            onSelectBed={setSelectedBedId}
          />
        </div>
      </div>

      {selectedBedId && bedTimeline && <StageAnalyticsBedTimeline timeline={bedTimeline} />}
    </div>
  )
}
