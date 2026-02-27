'use client'
// StageDelayBarChart — Vertical SVG bar chart for US-10.5
// Epic 10: Management Report Dashboard
//
// Shows average duration per stage sorted by duration (worst first).
// Bottleneck stages highlighted in red/amber.
// Pure SVG — no external chart library required.

import { memo, useMemo } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Download } from 'lucide-react'
import { formatDuration } from '@/features/bed-dashboard/lib/duration-formatters'
import { exportChartAsPng } from '../lib/chart-export-utils'
import type { StageDelayRow } from '../types/report.types'

interface StageDelayBarChartProps {
  rows: StageDelayRow[]
}

const PADDING_TOP = 22   // room for duration label above tallest bar
const CHART_H = 160
const BAR_GAP = 10
const LABEL_AREA_H = 44
const SVG_H = PADDING_TOP + CHART_H + LABEL_AREA_H
const BAR_W = 36         // fixed width — prevents "bold" bars with few stages

function getBarColor(row: StageDelayRow): string {
  if (row.isBottleneck) return '#ef4444' // red
  return '#3b82f6'                       // blue
}

export const StageDelayBarChart = memo(function StageDelayBarChart({
  rows,
}: StageDelayBarChartProps) {
  const chartId = 'stage-delay-chart-svg'
  const displayRows = useMemo(
    () => rows.filter((r) => r.totalTransitions > 0),
    [rows]
  )

  const handleExport = () => exportChartAsPng(chartId, 'stage-delays')

  if (displayRows.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        No transition data for selected period
      </div>
    )
  }

  const maxMs = Math.max(...displayRows.map((r) => r.avgDurationMs), 1)
  const barCount = displayRows.length
  const totalW = Math.max(300, barCount * (BAR_W + BAR_GAP) + BAR_GAP)
  const barW = BAR_W

  return (
    <div className="space-y-4">
      <div className="flex justify-end px-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="text-muted-foreground border-border"
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Export PNG
        </Button>
      </div>

      <div id={chartId}>
        <svg
          viewBox={`0 0 ${totalW} ${SVG_H}`}
          width="100%"
          aria-label="Stage average duration bar chart"
          role="img"
          style={{ minHeight: SVG_H }}
        >
          {displayRows.map((row, i) => {
            const x = BAR_GAP + i * (barW + BAR_GAP)
            const barH = Math.max(4, (row.avgDurationMs / maxMs) * CHART_H)
            const y = PADDING_TOP + (CHART_H - barH)
            const color = getBarColor(row)

            // Truncate long stage names
            const label =
              row.stageName.length > 8
                ? row.stageName.slice(0, 7) + '…'
                : row.stageName

            return (
              <g key={row.stageId}>
                {/* Background track */}
                <rect
                  x={x}
                  y={PADDING_TOP}
                  width={barW}
                  height={CHART_H}
                  rx={3}
                  fill="#18181b"
                />

                {/* Value bar */}
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  rx={3}
                  fill={color}
                  opacity={0.85}
                />

                {/* Duration label above bar */}
                <text
                  x={x + barW / 2}
                  y={Math.max(12, y - 4)}
                  textAnchor="middle"
                  style={{
                    fontSize: 9,
                    fill: color,
                    fontFamily: 'inherit',
                    fontWeight: 600,
                  }}
                >
                  {formatDuration(row.avgDurationMs)}
                </text>

                {/* Stage name label below bar */}
                <text
                  x={x + barW / 2}
                  y={PADDING_TOP + CHART_H + 16}
                  textAnchor="middle"
                  style={{
                    fontSize: 9,
                    fill: row.isBottleneck ? color : '#71717a',
                    fontFamily: 'inherit',
                    fontWeight: row.isBottleneck ? 700 : 400,
                  }}
                >
                  {label}
                </text>

                {/* Bottleneck indicator dot */}
                {row.isBottleneck && (
                  <circle cx={x + barW / 2} cy={PADDING_TOP + CHART_H + 32} r={3} fill={color} />
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
})
