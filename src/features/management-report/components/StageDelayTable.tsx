'use client'
// StageDelayTable — US-10.5
// Detail table: transitions, avg/median/p90 durations and bottleneck flag.

import { AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { formatDuration } from '@/shared/lib/duration-formatters'
import { cn } from '@/shared/lib/utils'
import type { StageDelayRow } from '../types/report.types'

interface StageDelayTableProps {
  rows: StageDelayRow[]
}

const HEADERS = ['Stage', 'Transitions', 'Avg Duration', 'Median', 'p90', 'Status']

export function StageDelayTable({ rows }: StageDelayTableProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-foreground">Stage Detail</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Sorted by average duration — longest first
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card border-b border-border">
              <tr>
                {HEADERS.map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {rows.map((row) => (
                <tr
                  key={row.stageId}
                  className={cn(
                    'transition-colors',
                    row.isBottleneck ? 'bg-red-950/20 hover:bg-red-950/30' : 'hover:bg-muted'
                  )}
                >
                  <td className={cn(
                    'px-3 py-2 font-semibold text-xs',
                    row.isBottleneck ? 'text-red-300' : 'text-card-foreground'
                  )}>
                    {row.stageName}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground tabular-nums">{row.totalTransitions}</td>
                  <td className={cn(
                    'px-3 py-2 font-mono tabular-nums font-semibold',
                    row.isBottleneck ? 'text-red-300' : 'text-card-foreground'
                  )}>
                    {row.totalTransitions > 0
                      ? formatDuration(row.avgDurationMs)
                      : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground tabular-nums text-xs font-mono">
                    {row.medianDurationMs !== null ? formatDuration(row.medianDurationMs) : '—'}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground tabular-nums text-xs font-mono">
                    {row.p90DurationMs !== null ? formatDuration(row.p90DurationMs) : '—'}
                  </td>
                  <td className="px-3 py-2">
                    {row.isBottleneck ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-300 bg-red-500/10 border border-red-500/20 rounded px-1.5 py-0.5">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        Bottleneck
                      </span>
                    ) : (
                      <span className="text-zinc-700 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
