'use client'
// StageDelayBarChart — Interactive Recharts vertical bar chart (US-10.7 / #66)
// Epic 10: Management Report Dashboard
//
// Features: avg/median/p90 tooltips, bottleneck highlighting,
// Brush zoom/pan (when >6 stages), responsive layout, PNG export.

import { memo, useId } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Brush, Cell,
} from 'recharts'
import { Button } from '@/shared/components/ui/button'
import { formatDuration } from '@/features/bed-dashboard/lib/duration-formatters'
import { exportChartAsPng } from '../lib/chart-export-utils'
import type { StageDelayRow } from '../types/report.types'

interface StageDelayBarChartProps {
  rows: StageDelayRow[]
}

// ---------- Tooltip (Recharts v3 custom interface) ----------
interface StageTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{ payload: StageDelayRow }>
}
function StageTooltip({ active, payload }: StageTooltipProps) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded border border-zinc-700 bg-zinc-900 p-2.5 text-xs shadow-lg min-w-[180px]">
      <p className="font-semibold text-white mb-1">{row.stageName}</p>
      <p className="text-zinc-300">
        Avg: <span className="text-blue-300">{formatDuration(row.avgDurationMs)}</span>
      </p>
      {row.medianDurationMs !== null && (
        <p className="text-zinc-300">Median: {formatDuration(row.medianDurationMs)}</p>
      )}
      {row.p90DurationMs !== null && (
        <p className="text-zinc-300">P90: {formatDuration(row.p90DurationMs)}</p>
      )}
      <p className="text-zinc-300">Transitions: {row.totalTransitions}</p>
      {row.isBottleneck && <p className="text-red-400 mt-1">🔴 Bottleneck</p>}
    </div>
  )
}

// ---------- Main ----------
export const StageDelayBarChart = memo(function StageDelayBarChart({
  rows,
}: StageDelayBarChartProps) {
  const rawId = useId().replace(/:/g, '')
  const chartId = `${rawId}-stage-chart`

  const display = rows
    .filter((r) => r.totalTransitions > 0)
    .map((r) => ({ ...r, avgMs: r.avgDurationMs }))

  if (display.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">
        No transition data for selected period
      </div>
    )
  }

  const showBrush = display.length > 6

  return (
    <div className="space-y-2">
      {/* Export control */}
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => exportChartAsPng(chartId, 'stage-delays')}
        >
          Export PNG
        </Button>
      </div>

      {/* Chart */}
      <div id={chartId} role="img" aria-label="Stage average duration bar chart">
        <ResponsiveContainer width="100%" height={showBrush ? 280 : 240}>
          <BarChart
            data={display}
            margin={{ top: 20, right: 16, left: 8, bottom: showBrush ? 40 : 56 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="stageName"
              tick={{ fill: '#a1a1aa', fontSize: 10 }}
              axisLine={{ stroke: '#3f3f46' }}
              tickLine={false}
              angle={-30}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              tickFormatter={(v: number) => formatDuration(v)}
              tick={{ fill: '#71717a', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip content={<StageTooltip />} cursor={{ fill: '#27272a' }} />
            {showBrush && (
              <Brush
                dataKey="stageName"
                height={18}
                travellerWidth={6}
                fill="#18181b"
                stroke="#3f3f46"
              />
            )}
            <Bar dataKey="avgMs" maxBarSize={40} radius={[3, 3, 0, 0]}>
              {display.map((row) => (
                <Cell
                  key={row.stageId}
                  fill={row.isBottleneck ? '#ef4444' : '#3b82f6'}
                  opacity={0.88}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
})
