'use client'
// BedPerformanceChart — Horizontal SVG bar chart for US-10.4
// Epic 10: Management Report Dashboard
//
// Shows avg duration per bed as a horizontal bar.
// Outlier beds rendered in amber/red.
// Pure SVG — no external chart library required.

import { memo, useMemo, useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Download, Filter } from 'lucide-react'
import { formatDuration } from '@/features/bed-dashboard/lib/duration-formatters'
import { exportChartAsPng } from '../lib/chart-export-utils'
import type { BedPerformanceRow } from '../types/report.types'

interface BedPerformanceChartProps {
  rows: BedPerformanceRow[]
  /** Sorted/filtered externally — component just renders */
  maxRows?: number
}

const BAR_HEIGHT = 22
const BAR_GAP = 6
const LABEL_W = 52
const VALUE_W = 56
const CHART_W = 320
const BAR_MAX_W = CHART_W - LABEL_W - VALUE_W - 8

function getBarColor(row: BedPerformanceRow): string {
  if (!row.isOutlier) return '#3b82f6'
  if (row.delayRate > 50) return '#ef4444'
  return '#f59e0b'
}

export const BedPerformanceChart = memo(function BedPerformanceChart({
  rows,
  maxRows = 12,
}: BedPerformanceChartProps) {
  const [outliersOnly, setOutliersOnly] = useState(false)
  const chartId = 'bed-perf-chart-svg'

  const displayRows = useMemo(
    () => rows
      .filter((r) => r.patientsTreated > 0)
      .filter((r) => !outliersOnly || r.isOutlier)
      .slice(0, maxRows),
    [rows, maxRows, outliersOnly]
  )

  const handleExport = () => exportChartAsPng(chartId, 'bed-performance')

  if (displayRows.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOutliersOnly(!outliersOnly)}
            className={outliersOnly ? 'bg-amber-900/20 border-amber-800 text-amber-400' : ''}
          >
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            Outliers only
          </Button>
        </div>
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          {outliersOnly ? 'No outlier beds in this period' : 'No data for selected period'}
        </div>
      </div>
    )
  }

  const maxMs = Math.max(...displayRows.map((r) => r.avgDurationMs ?? 0), 1)
  const totalH = displayRows.length * (BAR_HEIGHT + BAR_GAP)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOutliersOnly(!outliersOnly)}
          className={outliersOnly ? 'bg-amber-900/20 border-amber-800 text-amber-400' : 'text-muted-foreground border-border'}
        >
          <Filter className="h-3.5 w-3.5 mr-1.5" />
          Outliers only
        </Button>
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
          viewBox={`0 0 ${CHART_W} ${totalH}`}
          width="100%"
          aria-label="Bed average duration bar chart"
          role="img"
          style={{ maxWidth: CHART_W }}
        >
          {displayRows.map((row, i) => {
            const y = i * (BAR_HEIGHT + BAR_GAP)
            const barW =
              row.avgDurationMs !== null
                ? Math.max(2, (row.avgDurationMs / maxMs) * BAR_MAX_W)
                : 0
            const color = getBarColor(row)

            return (
              <g key={row.bedId}>
                {/* Bed number label */}
                <text
                  x={LABEL_W - 4}
                  y={y + BAR_HEIGHT / 2 + 1}
                  textAnchor="end"
                  dominantBaseline="middle"
                  style={{
                    fontSize: 11,
                    fill: row.isOutlier ? color : '#a1a1aa',
                    fontFamily: 'inherit',
                    fontWeight: row.isOutlier ? 700 : 400,
                  }}
                >
                  {row.bedNumber}
                </text>

                {/* Background track */}
                <rect
                  x={LABEL_W}
                  y={y}
                  width={BAR_MAX_W}
                  height={BAR_HEIGHT}
                  rx={3}
                  fill="#27272a"
                />

                {/* Value bar */}
                <rect
                  x={LABEL_W}
                  y={y}
                  width={barW}
                  height={BAR_HEIGHT}
                  rx={3}
                  fill={color}
                  opacity={row.patientsTreated === 0 ? 0.3 : 0.85}
                />

                {/* Duration label */}
                <text
                  x={LABEL_W + BAR_MAX_W + 6}
                  y={y + BAR_HEIGHT / 2 + 1}
                  dominantBaseline="middle"
                  style={{ fontSize: 10, fill: '#71717a', fontFamily: 'inherit' }}
                >
                  {row.avgDurationMs !== null
                    ? formatDuration(row.avgDurationMs)
                    : '—'}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
})
