'use client'
// StageDelayView — US-10.5
// Epic 10: Management Report Dashboard
//
// Shows which stages have the longest average duration.
// Bottleneck stages are highlighted; date drill-down via preset filter.

import { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { AlertCircle, RefreshCw, Layers, AlertTriangle } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { formatDuration } from '@/features/bed-dashboard/lib/duration-formatters'
import { useStageDelayData, PRESETS } from '../hooks/useStageDelayData'
import { StageDelayBarChart } from './StageDelayBarChart'
import { StageDelayTable } from './StageDelayTable'

interface StageDelayViewProps {
  readOnly?: boolean
  className?: string
}

export function StageDelayView({ readOnly = false, className }: StageDelayViewProps) {
  const {
    preset, setPreset,
    selectedPreset,
    report, loading, error, lastRefreshed,
    reload,
  } = useStageDelayData()

  const bottlenecks = useMemo(
    () => report?.rows.filter((r) => r.isBottleneck) ?? [],
    [report]
  )

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header + toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-white">
            <Layers className="h-6 w-6 text-purple-400" />
            Stage-Wise Delays
          </h2>
          <p className="text-sm text-zinc-400 mt-0.5">
            Average time patients spend in each stage — sorted worst first
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p.value}
              size="sm"
              variant={preset === p.value ? 'default' : 'outline'}
              onClick={() => setPreset(p.value)}
            >
              {p.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            onClick={reload}
            disabled={loading || readOnly}
            title="Refresh"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-800 bg-red-950/40">
          <CardContent className="pt-4 flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </CardContent>
        </Card>
      )}

      {/* Bottleneck callout */}
      {!loading && bottlenecks.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-red-600/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
          <span>
            <strong>Bottleneck{bottlenecks.length > 1 ? 's' : ''} detected:</strong>{' '}
            {bottlenecks.map((b) => b.stageName).join(', ')} —
            avg duration is significantly above the overall mean (
            {formatDuration(report?.overallMeanMs ?? 0)})
          </span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-52 animate-pulse rounded-lg bg-zinc-800" />
          <div className="h-48 animate-pulse rounded-lg bg-zinc-800" />
        </div>
      ) : report && report.rows.length > 0 ? (
        <div className="space-y-6">
          {/* Bar chart */}
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white">Average Duration per Stage</CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                {selectedPreset.label} range ·{' '}
                {report.overallMeanMs > 0
                  ? `Overall mean: ${formatDuration(report.overallMeanMs)}`
                  : 'Insufficient data'}
                {lastRefreshed && ` · Updated ${lastRefreshed.toLocaleTimeString()}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 overflow-x-auto">
              <div className="flex gap-3 items-center mb-3 text-[10px] text-zinc-500">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-blue-500 opacity-85" /> Normal
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-red-500 opacity-85" /> Bottleneck (&gt;1.5× mean)
                </span>
              </div>
              <StageDelayBarChart rows={report.rows} />
            </CardContent>
          </Card>

          {/* Detail table */}
          <StageDelayTable rows={report.rows} />
        </div>
      ) : (
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardContent className="pt-8 pb-8 flex items-center justify-center">
            <p className="text-zinc-500 text-sm">No stage transition data for the selected period</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
