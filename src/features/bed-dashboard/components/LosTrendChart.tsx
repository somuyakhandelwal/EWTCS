// LosTrendChart — Daily average LoS trend chart with optional target line
// EPIC 10: Management Report Dashboard
'use client'

import { memo, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { formatElapsedTime } from '../lib/utils'
import { cn } from '@/shared/lib/utils'
import type { LosTrendPoint } from '../lib/los-queries'
import {
  CHART_HEIGHT,
  CHART_PADDING,
  computeChartData,
  formatDateLabel,
} from '../lib/los-chart-compute'

interface LosTrendChartProps {
  trend: LosTrendPoint[]
  targetLosMs: number | null
  className?: string
}

export const LosTrendChart = memo(function LosTrendChart({
  trend,
  targetLosMs,
  className,
}: LosTrendChartProps) {
  const computed = useMemo(
    () => computeChartData(trend, targetLosMs),
    [trend, targetLosMs],
  )

  if (trend.length === 0) {
    return (
      <Card className={cn('bg-zinc-900 border-zinc-800', className)}>
        <CardHeader>
          <CardTitle className="text-sm text-white">Average LoS Trend</CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            No discharge data for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 text-zinc-600 text-sm">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('bg-zinc-900 border-zinc-800', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm text-white">Average LoS Trend</CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Daily average length of stay · {trend.length} day{trend.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 text-[10px] text-zinc-400">
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-0.5 bg-blue-500 rounded" /> Avg LoS
            </span>
            {targetLosMs !== null && (
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-0.5 bg-red-500 rounded border-t border-dashed border-red-500" /> Target
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-2">
        {computed && (
          <svg
            viewBox={`0 0 ${computed.totalWidth} ${CHART_HEIGHT}`}
            className="w-full"
            aria-label="Average length of stay trend chart"
          >
            {/* ── Grid lines (Y-axis ticks) ── */}
            {computed.ticks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={CHART_PADDING.left}
                  x2={computed.totalWidth - CHART_PADDING.right}
                  y1={tick.y}
                  y2={tick.y}
                  stroke="#3f3f46"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={CHART_PADDING.left - 6}
                  y={tick.y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#71717a"
                >
                  {formatElapsedTime(tick.ms)}
                </text>
              </g>
            ))}

            {/* ── Target line ── */}
            {targetLosMs !== null && (
              <g>
                <line
                  x1={CHART_PADDING.left}
                  x2={computed.totalWidth - CHART_PADDING.right}
                  y1={computed.toY(targetLosMs)}
                  y2={computed.toY(targetLosMs)}
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeDasharray="6 3"
                />
                <text
                  x={computed.totalWidth - CHART_PADDING.right + 4}
                  y={computed.toY(targetLosMs) + 4}
                  fontSize="9"
                  fill="#ef4444"
                >
                  Target
                </text>
              </g>
            )}

            {/* ── Area fill beneath trend line ── */}
            <defs>
              <linearGradient id="losAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <polygon
              points={[
                `${computed.toX(0)},${CHART_HEIGHT - CHART_PADDING.bottom}`,
                ...trend.map((p, i) => `${computed.toX(i)},${computed.toY(p.averageLosMs)}`),
                `${computed.toX(trend.length - 1)},${CHART_HEIGHT - CHART_PADDING.bottom}`,
              ].join(' ')}
              fill="url(#losAreaGrad)"
            />

            {/* ── Trend line ── */}
            <polyline
              points={computed.linePoints}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* ── Data point dots + tooltips ── */}
            {trend.map((point, i) => (
              <g key={point.date}>
                <circle
                  cx={computed.toX(i)}
                  cy={computed.toY(point.averageLosMs)}
                  r="4"
                  fill="#1e3a5f"
                  stroke="#3b82f6"
                  strokeWidth="2"
                />
                {/* Native SVG tooltip */}
                <title>
                  {`${formatDateLabel(point.date)}\nAvg: ${formatElapsedTime(point.averageLosMs)}\nPatients: ${point.patientCount}`}
                </title>
              </g>
            ))}

            {/* ── X-axis date labels (show every Nth label to avoid overlap) ── */}
            {trend.map((point, i) => {
              const step = Math.max(1, Math.floor(trend.length / 7))
              if (i % step !== 0 && i !== trend.length - 1) return null
              return (
                <text
                  key={point.date}
                  x={computed.toX(i)}
                  y={CHART_HEIGHT - CHART_PADDING.bottom + 18}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#71717a"
                >
                  {formatDateLabel(point.date)}
                </text>
              )
            })}
          </svg>
        )}
      </CardContent>
    </Card>
  )
})
