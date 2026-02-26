// PatientCountCards — Metric display cards for PatientCountView (US-10.1)
// Epic 10: Management Report Dashboard

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/shared/components/ui/card'
import { formatDuration } from '@/shared/lib/duration-formatters'
import type { PatientCountSummary } from '../types/report.types'

interface PatientCountCardsProps {
  summary: PatientCountSummary | null
  loading: boolean
  lastRefreshed: Date | null
  periodLabel: string
}

export function PatientCountCards({
  summary,
  loading,
  lastRefreshed,
  periodLabel,
}: PatientCountCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Primary count card */}
      <Card className="md:col-span-1 border-blue-800/40 bg-gradient-to-br from-blue-950/60 to-zinc-900">
        <CardHeader className="pb-2">
          <CardDescription className="text-blue-300">{periodLabel}</CardDescription>
          <CardTitle className="text-6xl font-extrabold text-foreground leading-none">
            {loading ? (
              <span className="animate-pulse text-zinc-600">—</span>
            ) : (
              <span>{summary?.totalPatients ?? 0}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Includes all discharged &amp; transferred patients
          </p>
          {lastRefreshed && (
            <p className="text-xs text-zinc-600 mt-1">
              Updated {lastRefreshed.toLocaleTimeString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Average duration card */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardDescription className="text-xs text-muted-foreground">
            Avg. Stay Duration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">
            {loading ? (
              <span className="animate-pulse text-zinc-600">—</span>
            ) : (
              formatDuration(summary?.avgDurationMs ?? null)
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Average time from admission to discharge
          </p>
        </CardContent>
      </Card>

      {/* Reporting period card */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardDescription className="text-xs text-muted-foreground">
            Reporting Period
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {summary && !loading ? (
            <>
              <div className="text-sm text-card-foreground font-medium">
                {new Date(summary.rangeStart).toLocaleDateString(undefined, {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </div>
              <div className="text-xs text-muted-foreground">to</div>
              <div className="text-sm text-card-foreground font-medium">
                {new Date(summary.rangeEnd).toLocaleDateString(undefined, {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </div>
            </>
          ) : (
            <div className="text-sm text-zinc-600 animate-pulse">Loading…</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
