'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Clock, CheckCircle2, AlertTriangle, TrendingDown } from 'lucide-react'
import { formatDuration } from '../lib/duration-formatters'
import type { DurationMetricSummary } from '../lib/stage-analytics'

interface StageAnalyticsTATProps {
  erSummary: DurationMetricSummary | null
  triageSummary: DurationMetricSummary | null
  erCleaningSummary: DurationMetricSummary | null
  triageCleaningSummary: DurationMetricSummary | null
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
      <div className="mb-1 flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium text-gray-600">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtext ? <p className="mt-1 text-xs text-gray-500">{subtext}</p> : null}
    </div>
  )
}

function SummaryGrid({
  summary,
  averageLabel,
}: {
  summary: DurationMetricSummary
  averageLabel: string
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      <TATMetricCard
        label="Total Cycles"
        value={String(summary.totalCycles)}
        subtext="completed"
        icon={<CheckCircle2 className="h-3.5 w-3.5 text-teal-500" />}
        colorClass="bg-teal-50 border-teal-200"
      />
      <TATMetricCard
        label={averageLabel}
        value={formatDuration(summary.averageDurationMs)}
        subtext="mean duration"
        icon={<Clock className="h-3.5 w-3.5 text-blue-500" />}
        colorClass="bg-blue-50 border-blue-200"
      />
      <TATMetricCard
        label="Median"
        value={formatDuration(summary.medianDurationMs)}
        subtext="50th percentile"
        icon={<TrendingDown className="h-3.5 w-3.5 text-indigo-500" />}
        colorClass="bg-indigo-50 border-indigo-200"
      />
      <TATMetricCard
        label="Fastest"
        value={formatDuration(summary.minDurationMs)}
        subtext="best case"
        icon={<CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
        colorClass="bg-green-50 border-green-200"
      />
      <TATMetricCard
        label="Slowest"
        value={formatDuration(summary.maxDurationMs)}
        subtext="worst case"
        icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
        colorClass="bg-amber-50 border-amber-200"
      />
    </div>
  )
}

function SummarySection({
  title,
  description,
  summary,
  averageLabel,
}: {
  title: string
  description: string
  summary: DurationMetricSummary | null
  averageLabel: string
}) {
  if (!summary || summary.totalCycles === 0) {
    return (
      <div className="space-y-2 rounded-lg border border-dashed p-4">
        <h4 className="font-semibold text-sm">{title}</h4>
        <p className="text-sm text-gray-500">{description}</p>
        <p className="text-sm text-gray-500">No completed cycles recorded yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div>
        <h4 className="font-semibold text-sm">{title}</h4>
        <p className="text-sm text-gray-500">{description}</p>
      </div>

      <SummaryGrid summary={summary} averageLabel={averageLabel} />

      {summary.p90DurationMs !== null ? (
        <p className="text-xs text-gray-400">
          90% of cycles complete within{' '}
          <span className="font-medium text-gray-600">{formatDuration(summary.p90DurationMs)}</span>.
        </p>
      ) : null}
    </div>
  )
}

export function StageAnalyticsTAT({
  erSummary,
  triageSummary,
  erCleaningSummary,
  triageCleaningSummary,
}: StageAnalyticsTATProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-teal-600" />
          Workflow Turnaround Time
        </CardTitle>
        <p className="text-sm text-gray-500">
          Whole TAT stops when the bed enters cleaning. Cleaning duration is tracked separately.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <SummarySection
            title="Emergency Ward TAT"
            description="ER bed assignment to ER bed entering cleaning."
            summary={erSummary}
            averageLabel="Average ER TAT"
          />
          <SummarySection
            title="Triage Area TAT"
            description="Triage bed assignment to triage bed entering cleaning."
            summary={triageSummary}
            averageLabel="Average Triage TAT"
          />
          <SummarySection
            title="ER Cleaning TAT"
            description="Cleaning start to Empty for ER beds."
            summary={erCleaningSummary}
            averageLabel="Average ER Cleaning"
          />
          <SummarySection
            title="Triage Cleaning TAT"
            description="Cleaning start to Empty for triage beds."
            summary={triageCleaningSummary}
            averageLabel="Average Triage Cleaning"
          />
        </div>
      </CardContent>
    </Card>
  )
}
