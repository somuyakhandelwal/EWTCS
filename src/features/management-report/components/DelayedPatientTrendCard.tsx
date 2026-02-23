'use client'
// DelayedPatientTrendCard — Interactive Recharts area chart (US-10.7 / #66)
// Epic 10: Management Report Dashboard
//
// Features: area + target-line overlay, Brush zoom/pan (>7 points),
// detailed tooltips, responsive layout, PNG export.

import { useId } from 'react'
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Brush, ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { exportChartAsPng } from '../lib/chart-export-utils'
import type { DelayTrendPoint } from '../types/report.types'

// ---------- Tooltip (Recharts v3 custom interface) ----------
interface TrendTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{ payload: DelayTrendPoint }>
  targetPct: number | null
}
function TrendTooltip({ active, payload, targetPct }: TrendTooltipProps) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  const dateLabel = new Date(point.date + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  })
  return (
    <div className="rounded border border-zinc-700 bg-zinc-900 p-2.5 text-xs shadow-lg min-w-[160px]">
      <p className="font-semibold text-white mb-1">{dateLabel}</p>
      <p className="text-zinc-300">
        Delayed: <span className="text-blue-300">{point.delayPct.toFixed(1)}%</span>
      </p>
      <p className="text-zinc-300">Delayed patients: {point.delayedPatients}</p>
      <p className="text-zinc-300">Total patients: {point.totalPatients}</p>
      {targetPct !== null && (
        <p className={point.delayPct <= targetPct ? 'text-emerald-400' : 'text-red-400'}>
          Target: {targetPct}% {point.delayPct <= targetPct ? '✓' : '✗'}
        </p>
      )}
    </div>
  )
}

// ---------- X-axis tick formatter ----------
function fmtDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
  })
}

// ---------- Main ----------
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
  const rawId = useId().replace(/:/g, '')
  const chartId = `${rawId}-trend-chart`
  const showBrush = trend.length > 7

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm text-white">Daily Trend</CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Delay % per day{targetPct !== null ? ` · Target: ${targetPct}%` : ''}
            </CardDescription>
          </div>
          {!loading && trend.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => exportChartAsPng(chartId, 'delay-trend')}
            >
              Export PNG
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-36 animate-pulse rounded bg-zinc-800" />
        ) : trend.length > 0 ? (
          <div id={chartId} role="img" aria-label="Daily delayed patient percentage trend chart">
            <ResponsiveContainer width="100%" height={showBrush ? 220 : 180}>
              <ComposedChart
                data={trend}
                margin={{ top: 8, right: 12, left: 0, bottom: showBrush ? 24 : 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtDate}
                  tick={{ fill: '#71717a', fontSize: 10 }}
                  axisLine={{ stroke: '#3f3f46' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(v: number) => `${v}%`}
                  tick={{ fill: '#71717a', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                  width={36}
                />
                <Tooltip
                  content={(props: { active?: boolean; payload?: ReadonlyArray<{ payload: DelayTrendPoint }> }) => (
                    <TrendTooltip active={props.active} payload={props.payload} targetPct={targetPct} />
                  )}
                />
                {targetPct !== null && (
                  <ReferenceLine
                    y={targetPct}
                    stroke="#10b981"
                    strokeDasharray="5 4"
                    label={{
                      value: `Target ${targetPct}%`,
                      fill: '#10b981',
                      fontSize: 9,
                      position: 'insideTopRight',
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="delayPct"
                  fill="#3b82f620"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  name="Delay %"
                />
                {showBrush && (
                  <Brush
                    dataKey="date"
                    tickFormatter={fmtDate}
                    height={18}
                    travellerWidth={6}
                    fill="#18181b"
                    stroke="#3f3f46"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-36 text-zinc-500 text-sm">
            Not enough data for trend
          </div>
        )}
      </CardContent>
    </Card>
  )
}
