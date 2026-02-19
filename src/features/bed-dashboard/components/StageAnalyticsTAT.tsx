'use client'
// Stage Analytics TAT (Turnaround Time) Component
// US-2.4: Track Bed Cleaning and Turnaround Time
// Epic 2: One-Click Stage Update System
//
// Displays bed turnaround time metrics — time from discharge (Cleaning)
// to bed ready for next patient (Empty).

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Clock, CheckCircle2, AlertTriangle, TrendingDown } from 'lucide-react'
import { formatDuration } from '../lib/duration-formatters'
import type { TATSummary } from '../lib/tat-queries'

interface StageAnalyticsTATProps {
  summary: TATSummary | null
}

interface TATMetricCardProps {
  label: string
  value: string
  subtext?: string
  icon: React.ReactNode
  colorClass: string
}

function TATMetricCard({ label, value, subtext, icon, colorClass }: TATMetricCardProps) {
  return (
    <div className={`rounded-lg border p-4 ${colorClass}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium text-gray-600">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
    </div>
  )
}

/**
 * Displays aggregate Bed Turnaround Time (TAT) statistics.
 * TAT = time the bed spends in the Cleaning stage before being reset to Empty.
 */
export function StageAnalyticsTAT({ summary }: StageAnalyticsTATProps) {
  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-teal-600" />
            Bed Turnaround Time (TAT)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No turnaround data available yet.</p>
        </CardContent>
      </Card>
    )
  }

  const noCycles = summary.totalCycles === 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-teal-600" />
          Bed Turnaround Time (TAT)
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Time from patient discharge (Cleaning) to bed ready for next patient (Empty).
        </p>
      </CardHeader>
      <CardContent>
        {noCycles ? (
          <p className="text-sm text-gray-500">
            No completed cleaning cycles recorded yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <TATMetricCard
              label="Total Cycles"
              value={String(summary.totalCycles)}
              subtext="completed"
              icon={<CheckCircle2 className="h-3.5 w-3.5 text-teal-500" />}
              colorClass="bg-teal-50 border-teal-200"
            />
            <TATMetricCard
              label="Average TAT"
              value={formatDuration(summary.averageDurationMs)}
              subtext="mean cleaning time"
              icon={<Clock className="h-3.5 w-3.5 text-blue-500" />}
              colorClass="bg-blue-50 border-blue-200"
            />
            <TATMetricCard
              label="Median TAT"
              value={formatDuration(summary.medianDurationMs)}
              subtext="50th percentile"
              icon={<TrendingDown className="h-3.5 w-3.5 text-indigo-500" />}
              colorClass="bg-indigo-50 border-indigo-200"
            />
            <TATMetricCard
              label="Fastest TAT"
              value={formatDuration(summary.minDurationMs)}
              subtext="best case"
              icon={<CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
              colorClass="bg-green-50 border-green-200"
            />
            <TATMetricCard
              label="Slowest TAT"
              value={formatDuration(summary.maxDurationMs)}
              subtext="worst case"
              icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
              colorClass="bg-amber-50 border-amber-200"
            />
          </div>
        )}
        {!noCycles && summary.p90DurationMs !== null && (
          <p className="text-xs text-gray-400 mt-3">
            90% of cleaning cycles complete within{' '}
            <span className="font-medium text-gray-600">
              {formatDuration(summary.p90DurationMs)}
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
