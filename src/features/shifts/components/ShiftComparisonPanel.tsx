// Shift Comparison Panel
// EPIC 8: Shift Management (US-8.3, US-8.4)
// Purpose: Date-range-filtered shift performance comparison table.

'use client'

import { useState, useTransition } from 'react'
import { Trophy, TrendingDown } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { getShiftPerformanceAction } from '../actions/shift-actions'
import { formatDuration } from '@/features/bed-dashboard/lib/duration-formatters'
import type { ShiftPerformance } from '../types/shift'

function formatTime(t: string): string {
  return t.slice(0, 5)
}

function bestIdx(
  perf: ShiftPerformance[],
  key: keyof ShiftPerformance,
  higher: boolean
): number {
  if (perf.length === 0) return -1
  let best = -1
  let bestVal: number | null = null
  perf.forEach((p, i) => {
    const v = p[key] as number | null
    if (v === null) return
    if (bestVal === null || (higher ? v > bestVal : v < bestVal)) {
      bestVal = v
      best = i
    }
  })
  return best
}

export function ShiftComparisonPanel() {
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10))
  const [performance, setPerformance] = useState<ShiftPerformance[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleLoad() {
    setError(null)
    startTransition(async () => {
      const result = await getShiftPerformanceAction({
        startDate: new Date(startDate).toISOString(),
        endDate:   new Date(endDate + 'T23:59:59').toISOString(),
      })
      if (!result.success) {
        setError(result.error ?? 'Failed to load shift data')
        return
      }
      setPerformance(result.performance ?? [])
    })
  }

  const inputClass = cn(
    'rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white',
    'focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50'
  )

  const bestThroughput = performance ? bestIdx(performance, 'totalTransitions', true)  : -1
  const bestDelay      = performance ? bestIdx(performance, 'delayRate', false)        : -1
  const bestTAT        = performance ? bestIdx(performance, 'averageTATMs', false)     : -1

  return (
    <div className="space-y-5">
      {/* Date range controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={isPending}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={isPending}
            className={inputClass}
          />
        </div>
        <Button
          size="sm"
          onClick={handleLoad}
          disabled={isPending}
          className="bg-zinc-700 hover:bg-zinc-600 text-white"
        >
          {isPending ? 'Loading…' : 'Load'}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-400 rounded border border-red-800 bg-red-950/30 px-3 py-2">
          {error}
        </p>
      )}

      {performance === null && !isPending && (
        <p className="text-sm text-zinc-500">Select a date range and click Load to compare shifts.</p>
      )}

      {performance !== null && performance.length === 0 && (
        <p className="text-sm text-zinc-500">No shift data for this period. Bed updates must occur after migration 017 for shift tags to appear.</p>
      )}

      {performance !== null && performance.length > 0 && (
        <div className="rounded-lg border border-zinc-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60">
                {['Shift', 'Hours', 'Transitions', 'Beds Used', 'Avg TAT', 'Delay Rate'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {performance.map((p, i) => (
                <tr key={p.shiftId} className="bg-zinc-900/20 hover:bg-zinc-900/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-white whitespace-nowrap">
                    {p.shiftName}
                    {i === bestThroughput && (
                      <Trophy className="inline h-3.5 w-3.5 ml-1.5 text-yellow-400" aria-label="Highest throughput" />
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-300 whitespace-nowrap">
                    {formatTime(p.startTime)}–{formatTime(p.endTime)}
                  </td>
                  <td className={cn('px-4 py-3 tabular-nums', i === bestThroughput ? 'text-green-400 font-semibold' : 'text-zinc-300')}>
                    {p.totalTransitions}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-zinc-300">{p.bedsUsed}</td>
                  <td className={cn('px-4 py-3 tabular-nums whitespace-nowrap', i === bestTAT ? 'text-green-400 font-semibold' : 'text-zinc-300')}>
                    {p.averageTATMs !== null ? formatDuration(p.averageTATMs) : '—'}
                    {i === bestTAT && <TrendingDown className="inline h-3.5 w-3.5 ml-1 text-green-400" />}
                  </td>
                  <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        i === bestDelay
                          ? 'bg-green-900/40 text-green-400 border border-green-800/40'
                          : p.delayRate > 0.3
                          ? 'bg-red-900/30 text-red-400 border border-red-800/30'
                          : p.delayRate > 0.1
                          ? 'bg-amber-900/30 text-amber-400 border border-amber-800/30'
                          : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/40'
                      )}
                    >
                      {(p.delayRate * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-2 text-xs text-zinc-600 border-t border-zinc-800">
            <Trophy className="inline h-3 w-3 mr-1 text-yellow-400" />
            = best in column &nbsp;&nbsp;
            Delay rate = transitions exceeding the configured delay threshold ÷ total transitions
          </p>
        </div>
      )}
    </div>
  )
}
