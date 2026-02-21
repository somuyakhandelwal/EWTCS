'use client'
// DelayedPatientTrendCard — US-10.3
// Daily delay-% trend bars for the last 10 days.

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'
import type { DelayTrendPoint } from '../types/report.types'

interface TrendBarProps { pct: number; targetPct: number | null }

function TrendBar({ pct, targetPct }: TrendBarProps) {
  const color =
    targetPct === null
      ? 'bg-blue-500'
      : pct <= targetPct
        ? 'bg-emerald-500'
        : pct <= targetPct * 1.25
          ? 'bg-amber-500'
          : 'bg-red-500'
  return (
    <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
      <div
        className={cn('h-1.5 rounded-full transition-all', color)}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  )
}

interface DelayedPatientTrendCardProps {
  trend: DelayTrendPoint[]
  targetPct: number | null
  loading: boolean
}

export function DelayedPatientTrendCard({
  trend,
  targetPct,
  loading,
}: DelayedPatientTrendCardProps) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-white">Daily Trend</CardTitle>
        <CardDescription className="text-xs text-zinc-400">Delay % per day</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-36 animate-pulse rounded bg-zinc-800" />
        ) : trend.length > 0 ? (
          <div className="space-y-1.5">
            {trend.slice(-10).map((point) => (
              <div key={point.date} className="space-y-0.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-zinc-500">
                    {new Date(point.date + 'T00:00:00').toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {point.delayPct}%
                    <span className="text-zinc-600 ml-1">
                      ({point.delayedPatients}/{point.totalPatients})
                    </span>
                  </span>
                </div>
                <TrendBar pct={point.delayPct} targetPct={targetPct} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-36 text-zinc-600 text-sm">
            No trend data
          </div>
        )}
      </CardContent>
    </Card>
  )
}
