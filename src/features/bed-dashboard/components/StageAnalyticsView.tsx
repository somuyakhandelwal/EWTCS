'use client'

// Stage Analytics View Component
// Displays ER stage analytics, triage state analytics, workflow TAT, and delay attribution.

import { useState } from 'react'
import { Card } from '@/shared/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { exportStageTransitionsAsCSV } from '../actions/analytics-actions'
import { logger } from '@/shared/config/logger'
import { cn } from '@/shared/lib/utils'
import { StageAnalyticsHeader } from './StageAnalyticsHeader'
import { StageAnalyticsMetrics } from './StageAnalyticsMetrics'
import { StageAnalyticsDurationAnalysis } from './StageAnalyticsDurationAnalysis'
import { StageAnalyticsWaitingBeds } from './StageAnalyticsWaitingBeds'
import { StageAnalyticsBedTimeline } from './StageAnalyticsBedTimeline'
import { StageAnalyticsAttribution } from './StageAnalyticsAttribution'
import { StageAnalyticsTAT } from './StageAnalyticsTAT'
import { useAnalyticsData } from '../hooks/useAnalyticsData'

interface StageAnalyticsViewProps {
  title?: string
  className?: string
  readOnly?: boolean
}

export function StageAnalyticsView({
  title = 'Stage Analytics',
  className,
  readOnly = false,
}: StageAnalyticsViewProps) {
  const {
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
  } = useAnalyticsData()

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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export'
      setExportError(message)
      logger.error('Failed to export data', error as Error)
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="h-40 animate-pulse rounded-lg bg-zinc-100" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <div className="px-6 pb-6 pt-6">
          <div className="mb-2 flex items-center gap-2 font-semibold text-red-700">
            <AlertCircle className="h-4 w-4" />
            Error Loading Analytics
          </div>
          <p className="mb-4 text-sm text-red-600">{error}</p>
          <Button variant="outline" onClick={reload} className="mt-2" disabled={readOnly}>
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
        description="Emergency Ward stage analytics with separate triage workflow TAT metrics"
        onExportCSV={handleExportCSV}
        exporting={exporting}
        readOnly={readOnly}
      />

      {exportError ? <p className="px-1 text-sm text-red-600">{exportError}</p> : null}

      <StageAnalyticsMetrics summary={summary} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <StageAnalyticsDurationAnalysis
            stats={erStageDurationStats}
            title="ER Stage Duration Analysis"
            description="Time spent in each active ER stage before the next transition."
            emptyMessage="No ER stage data available."
          />
          <StageAnalyticsDurationAnalysis
            stats={triageStateDurationStats}
            title="Triage State Duration Analysis"
            description="Time spent in each triage state before the next workflow change."
            emptyMessage="No triage state data available."
          />
        </div>
        <div>
          <StageAnalyticsWaitingBeds
            beds={longestWaitingBeds}
            selectedBedId={selectedBedId}
            onSelectBed={setSelectedBedId}
            readOnly={readOnly}
          />
        </div>
      </div>

      {selectedBedId && bedTimeline ? <StageAnalyticsBedTimeline timeline={bedTimeline} /> : null}

      <StageAnalyticsTAT
        erSummary={erTatSummary}
        triageSummary={triageTatSummary}
        erCleaningSummary={erCleaningTatSummary}
        triageCleaningSummary={triageCleaningTatSummary}
      />

      <StageAnalyticsAttribution stats={attributionStats} />
    </div>
  )
}
