'use client'
// StageDelayBarChart — Vertical SVG bar chart for US-10.5
// Epic 10: Management Report Dashboard
//
// Shows average duration per stage sorted by duration (worst first).
// Bottleneck stages highlighted in red/amber.
// Pure SVG — no external chart library required.

import { memo, useMemo } from 'react'
import { formatDuration } from '@/features/bed-dashboard/lib/duration-formatters'
import type { StageDelayRow } from '../types/report.types'

interface StageDelayBarChartProps {
  rows: StageDelayRow[]
}

const CHART_H = 160
const BAR_GAP = 8
const LABEL_AREA_H = 38
const SVG_H = CHART_H + LABEL_AREA_H
const MIN_BAR_W = 24

function getBarColor(row: StageDelayRow): string {
  if (row.isBottleneck) return '#ef4444' // red
  return '#3b82f6'                       // blue
}

export const StageDelayBarChart = memo(function StageDelayBarChart({
  rows,
}: StageDelayBarChartProps) {
  const displayRows = useMemo(
    () => rows.filter((r) => r.totalTransitions > 0),
    [rows]
  )

  if (displayRows.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">
        No transition data for selected period
      </div>
    )
  }

  const maxMs = Math.max(...displayRows.map((r) => r.avgDurationMs), 1)
  const barCount = displayRows.length
  const totalW = Math.max(300, barCount * (MIN_BAR_W + BAR_GAP) + BAR_GAP)
  const barW = Math.max(MIN_BAR_W, (totalW - BAR_GAP * (barCount + 1)) / barCount)

  return (
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
        const y = CHART_H - barH
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
              y={0}
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
              y={y - 3}
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
              y={CHART_H + 14}
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
              <circle cx={x + barW / 2} cy={CHART_H + 28} r={3} fill={color} />
            )}
          </g>
        )
      })}
    </svg>
  )
})
