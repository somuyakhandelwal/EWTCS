'use client'
// BedPerformanceChart — Interactive Recharts horizontal bar chart (US-10.7 / #66)
// Epic 10: Management Report Dashboard
//
// Features: full-metric tooltips, Brush zoom/pan, outlier-only filter,
// responsive layout, PNG export via html2canvas.

import { memo, useState, useId } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Brush, Cell,
} from 'recharts'
import { Button } from '@/shared/components/ui/button'
import { formatDuration } from '@/features/bed-dashboard/lib/duration-formatters'
import { exportChartAsPng } from '../lib/chart-export-utils'
import type { BedPerformanceRow } from '../types/report.types'

interface BedPerformanceChartProps {
  rows: BedPerformanceRow[]
  /** Sorted/filtered externally — component just renders */
  maxRows?: number
}

// ---------- Tooltip (Recharts v3 custom interface) ----------
interface BedTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{ payload: BedPerformanceRow }>
}
function BedTooltip({ active, payload }: BedTooltipProps) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded border border-zinc-700 bg-zinc-900 p-2.5 text-xs shadow-lg min-w-[160px]">
      <p className="font-semibold text-white mb-1">{row.bedNumber}</p>
      <p className="text-zinc-300">Avg: <span className="text-blue-300">{row.avgDurationMs !== null ? formatDuration(row.avgDurationMs) : '—'}</span></p>
      <p className="text-zinc-300">Min: {row.minDurationMs !== null ? formatDuration(row.minDurationMs) : '—'}</p>
      <p className="text-zinc-300">Max: {row.maxDurationMs !== null ? formatDuration(row.maxDurationMs) : '—'}</p>
      <p className="text-zinc-300">Patients: {row.patientsTreated}</p>
      <p className={row.delayRate > 50 ? 'text-red-400' : row.isOutlier ? 'text-amber-400' : 'text-zinc-300'}>
        Delay rate: {row.delayRate.toFixed(1)}%
      </p>
      {row.isOutlier && <p className="text-amber-400 mt-1">⚠ Outlier</p>}
    </div>
  )
}

// ---------- Bar colour ----------
function getBarFill(row: BedPerformanceRow): string {
  if (!row.isOutlier) return '#3b82f6'
  return row.delayRate > 50 ? '#ef4444' : '#f59e0b'
}

export const BedPerformanceChart = memo(function BedPerformanceChart({
  rows,
  maxRows = 12,
}: BedPerformanceChartProps) {
  const rawId = useId().replace(/:/g, '')
  const chartId = `${rawId}-bed-chart`
  const [outliersOnly, setOutliersOnly] = useState(false)

  const display = rows
    .filter((r) => r.patientsTreated > 0)
    .filter((r) => !outliersOnly || r.isOutlier)
    .slice(0, maxRows)
    .map((r) => ({ ...r, avgMs: r.avgDurationMs ?? 0 }))

  if (display.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
        {outliersOnly ? 'No outlier beds in this period' : 'No data for selected period'}
      </div>
    )
  }

  const chartH = Math.max(180, display.length * 34 + 40)

  return (
    <div className="space-y-2">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button
          size="sm"
          variant={outliersOnly ? 'default' : 'outline'}
          onClick={() => setOutliersOnly((v) => !v)}
          className="h-7 text-xs"
        >
          Outliers only
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => exportChartAsPng(chartId, 'bed-performance')}
        >
          Export PNG
        </Button>
      </div>

      {/* Chart */}
      <div id={chartId} role="img" aria-label="Bed average duration bar chart">
        <ResponsiveContainer width="100%" height={chartH}>
          <BarChart
            data={display}
            layout="vertical"
            margin={{ top: 4, right: 60, left: 8, bottom: 24 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v: number) => formatDuration(v)}
              tick={{ fill: '#71717a', fontSize: 10 }}
              axisLine={{ stroke: '#3f3f46' }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="bedNumber"
              width={44}
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<BedTooltip />} cursor={{ fill: '#27272a' }} />
            <Brush
              dataKey="bedNumber"
              height={18}
              travellerWidth={6}
              fill="#18181b"
              stroke="#3f3f46"
            />
            <Bar dataKey="avgMs" radius={[0, 3, 3, 0]} maxBarSize={22}>
              {display.map((row) => (
                <Cell key={row.bedId} fill={getBarFill(row)} opacity={0.88} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
})
