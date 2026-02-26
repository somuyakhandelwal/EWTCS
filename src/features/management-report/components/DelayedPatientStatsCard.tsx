'use client'
// DelayedPatientStatsCard — US-10.3
// Summary counts: total, delayed, on-time, and vs-target comparison.

import { TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'
import type { DelayedPatientsSummary } from '../types/report.types'

interface DelayedPatientStatsCardProps {
  summary: DelayedPatientsSummary | null
  loading: boolean
}

export function DelayedPatientStatsCard({ summary, loading }: DelayedPatientStatsCardProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-foreground">Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-5 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : summary ? (
          <>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Total patients</span>
              <span className="text-sm font-semibold text-foreground">{summary.totalPatients}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Delayed patients</span>
              <span className="text-sm font-semibold text-red-400">{summary.delayedPatients}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">On-time patients</span>
              <span className="text-sm font-semibold text-emerald-400">
                {summary.totalPatients - summary.delayedPatients}
              </span>
            </div>
            {summary.targetPct !== null && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">vs Target</span>
                <span className={cn(
                  'text-sm font-semibold flex items-center gap-1',
                  summary.delayPct <= summary.targetPct ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {summary.delayPct <= summary.targetPct
                    ? <TrendingDown className="h-3.5 w-3.5" />
                    : <TrendingUp className="h-3.5 w-3.5" />}
                  {summary.delayPct <= summary.targetPct
                    ? `${(summary.targetPct - summary.delayPct).toFixed(1)}% under`
                    : `${(summary.delayPct - summary.targetPct).toFixed(1)}% over`}
                </span>
              </div>
            )}
          </>
        ) : (
          <p className="text-zinc-600 text-xs">No data</p>
        )}
      </CardContent>
    </Card>
  )
}
