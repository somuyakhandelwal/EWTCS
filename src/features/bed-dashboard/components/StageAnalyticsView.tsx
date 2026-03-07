'use client'

// Stage Analytics View Component
// Epic: EPIC 3 - Time Tracking & Stage Logging
// Epic: EPIC 8 - Shift Management (US-8.3, US-8.4) — Shift Comparison tab added
// Displays comprehensive analytics: stage durations, TAT, delay attribution.
// Data-loading logic lives in useAnalyticsData hook.

import { useState } from 'react'
import { Card } from '@/shared/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { exportStageTransitionsAsCSV } from '../actions/analytics-actions'
import { logger } from '@/shared/config/logger'
import { StageAnalyticsHeader } from './StageAnalyticsHeader'
import { StageAnalyticsMetrics } from './StageAnalyticsMetrics'
import { StageAnalyticsDurationAnalysis } from './StageAnalyticsDurationAnalysis'
import { StageAnalyticsWaitingBeds } from './StageAnalyticsWaitingBeds'
import { StageAnalyticsBedTimeline } from './StageAnalyticsBedTimeline'
import { StageAnalyticsAttribution } from './StageAnalyticsAttribution'
import { StageAnalyticsTAT } from './StageAnalyticsTAT'
import { ShiftComparisonPanel } from '@/features/shifts/components/ShiftComparisonPanel'
import { useAnalyticsData } from '../hooks/useAnalyticsData'

type Tab = 'overview' | 'shifts'

interface StageAnalyticsViewProps {
  title?: string
  className?: string
}

export function StageAnalyticsView({ title = 'Stage Analytics', className }: StageAnalyticsViewProps) {
  const {
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
  } = useAnalyticsData()

  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const handleExportCSV = async () => {
    setExporting(true)
    setExportError(null)
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
      setExportError(message)
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
          <Button variant="outline" onClick={reload} className="mt-2">
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

      {exportError && (
        <p className="text-sm text-red-600 px-1">{exportError}</p>
      )}

      {/* Tab bar — Overview / Shift Comparison */}
      <div className="flex gap-1 border-b border-zinc-800 pb-0">
        {(['overview', 'shifts'] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-t-md transition-colors',
              activeTab === tab
                ? 'bg-zinc-800 text-white border border-b-zinc-800 border-zinc-700'
                : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            {tab === 'overview' ? 'Overview' : 'Shift Comparison'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
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

          {selectedBedId && bedTimeline && (
            <StageAnalyticsBedTimeline timeline={bedTimeline} />
          )}

          {/* US-2.4: Bed Turnaround Time — Cleaning → Empty duration */}
          <StageAnalyticsTAT summary={tatSummary} />

          {/* US-3.4: Delay root-cause attribution breakdown */}
          <StageAnalyticsAttribution stats={attributionStats} />
        </>
      )}

      {activeTab === 'shifts' && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white">Shift Performance Comparison</h3>
            <p className="text-sm text-zinc-400 mt-0.5">
              Compare throughput, delay rates, and average turnaround time across ward shifts.
            </p>
          </div>
          <ShiftComparisonPanel />
        </div>
      )}
    </div>
  )
}
