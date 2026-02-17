'use client'

// Stage Analytics View Component
// Epic: EPIC 3 - Time Tracking & Stage Logging
// Displays comprehensive analytics about stage transitions and time spent

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import {
  fetchStageDurationStats,
  fetchLongestWaitingBeds,
  fetchAnalyticsSummary,
  exportStageTransitionsAsCSV,
  fetchBedStageTimeline,
} from '../actions/analytics-actions'
import { formatDuration } from '../lib/analytics-utils'
import type { StageDurationStats, BedStageTimeline, StageTransitionRecord } from '../lib/stage-analytics'
import { logger } from '@/shared/config/logger'
import { Download, Clock, TrendingUp, AlertCircle } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

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

  // Fetch all analytics data
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

  // Load bed timeline when a bed is selected
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

      // Create a blob and download
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
        <CardHeader>
          <CardTitle className="text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Error Loading Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" onClick={loadAnalytics} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold trackingl-tight">{title}</h2>
          <p className="text-sm text-zinc-600 mt-1">Analyze patient flow through emergency ward stages</p>
        </div>
        <Button onClick={handleExportCSV} disabled={exporting} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Total Beds Used</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalBedsUsed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Total Transitions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalTransitions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Avg Time per Patient</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{formatDuration(summary.averageTimePerPatientMs)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Avg Transitions/Patient</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.averageTransitionsPerPatient.toFixed(1)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Patients Processed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalPatientsProcessed}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stage Duration Statistics */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Stage Duration Analysis
              </CardTitle>
              <CardDescription>Time spent in each stage (milliseconds)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stageDurationStats && stageDurationStats.length > 0 ? (
                  stageDurationStats.map((stat) => (
                    <div key={stat.stageId} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">{stat.stageName}</h4>
                        <Badge variant="outline">{stat.totalTransitions} transitions</Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-zinc-600">Average</p>
                          <p className="font-mono font-semibold">{formatDuration(stat.averageDurationMs)}</p>
                        </div>
                        <div>
                          <p className="text-zinc-600">Median (p50)</p>
                          <p className="font-mono font-semibold">{formatDuration(stat.medianDurationMs)}</p>
                        </div>
                        <div>
                          <p className="text-zinc-600">Min</p>
                          <p className="font-mono font-semibold">{formatDuration(stat.minDurationMs)}</p>
                        </div>
                        <div>
                          <p className="text-zinc-600">Max</p>
                          <p className="font-mono font-semibold">{formatDuration(stat.maxDurationMs)}</p>
                        </div>
                        <div>
                          <p className="text-zinc-600">p90</p>
                          <p className="font-mono font-semibold">{formatDuration(stat.p90DurationMs)}</p>
                        </div>
                        <div>
                          <p className="text-zinc-600">p95</p>
                          <p className="font-mono font-semibold">{formatDuration(stat.p95DurationMs)}</p>
                        </div>
                      </div>

                      {/* Visual bar showing relative time */}
                      <div className="mt-2 h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{
                            width: stat.averageDurationMs
                              ? `${Math.min((stat.averageDurationMs / (stat.maxDurationMs || 1)) * 100, 100)}%`
                              : '0%',
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-600">No stage data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Longest Waiting Beds */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                Longest Waiting Beds
              </CardTitle>
              <CardDescription>Currently in stage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {longestWaitingBeds && longestWaitingBeds.length > 0 ? (
                  longestWaitingBeds.map((bed) => (
                    <button
                      key={bed.bedId}
                      onClick={() => setSelectedBedId(bed.bedId)}
                      className={cn(
                        'w-full text-left p-3 rounded-lg border transition-colors hover:bg-zinc-50',
                        selectedBedId === bed.bedId && 'border-blue-500 bg-blue-50'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">{bed.bedNumber}</span>
                        <Badge variant="secondary">{formatDuration(bed.waitTimeMs)}</Badge>
                      </div>
                      <p className="text-xs text-zinc-600">{bed.currentStageName}</p>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-zinc-600">No occupied beds</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bed Timeline Details */}
      {selectedBedId && bedTimeline && (
        <Card>
          <CardHeader>
            <CardTitle>
              {bedTimeline.bedNumber} - Stage Timeline
            </CardTitle>
            <CardDescription>
              Total time: {formatDuration(bedTimeline.totalTimeMs)} | {bedTimeline.transitions.length} transitions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bedTimeline.transitions && bedTimeline.transitions.length > 0 ? (
                bedTimeline.transitions.map((transition: StageTransitionRecord, index: number) => (
                  <div key={transition.id} className="flex gap-4 text-sm">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      {index < bedTimeline.transitions.length - 1 && (
                        <div className="w-0.5 h-12 bg-zinc-200 my-1" />
                      )}
                    </div>
                    <div className="flex-1 pt-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">
                          {transition.fromStageName || 'Start'} → {transition.toStageName}
                        </span>
                        <span className="text-xs text-zinc-600">
                          {new Date(transition.transitionTime).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-600 mt-1">
                        Duration in this stage: <span className="font-mono">{formatDuration(transition.durationInCurrentStageMs)}</span>
                      </div>
                      {transition.notes && (
                        <p className="text-xs text-zinc-500 mt-1 italic">Note: {transition.notes}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-600">No transitions recorded</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
