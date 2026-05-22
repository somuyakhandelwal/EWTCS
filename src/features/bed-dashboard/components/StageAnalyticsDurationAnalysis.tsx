'use client'

// Stage Duration Analysis Component
// Epic: EPIC 3 - Time Tracking & Stage Logging

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Clock } from 'lucide-react'
import { formatDuration } from '../lib/analytics-utils'
import type { StageDurationStats } from '../lib/stage-analytics'

interface StageAnalyticsDurationAnalysisProps {
  stats: StageDurationStats[] | null
  title?: string
  description?: string
  emptyMessage?: string
}

export function StageAnalyticsDurationAnalysis({
  stats,
  title = 'Stage Duration Analysis',
  description = 'Time spent in each stage (milliseconds)',
  emptyMessage = 'No stage data available',
}: StageAnalyticsDurationAnalysisProps) {
  const renderStats = () => {
    if (!stats || stats.length === 0) {
      return <p className="text-sm text-zinc-600">{emptyMessage}</p>
    }

    return stats.map((stat) => (
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
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">{renderStats()}</div>
      </CardContent>
    </Card>
  )
}
