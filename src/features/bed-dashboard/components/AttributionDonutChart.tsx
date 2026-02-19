'use client'
// Attribution Donut Chart
// Epic 3: Time Tracking & Stage Logging (US-3.4)
// Pure SVG donut chart — no external chart library required.

import { memo } from 'react'
import type { DelayAttributionStats } from '../lib/stage-analytics'
import type { DelayAttribution } from '../lib/delay-attribution-config'

// SVG stroke colours per attribution — must stay in sync with ATTRIBUTION_COLORS
const STROKE_COLORS: Record<DelayAttribution, string> = {
  emergency_staff: '#f97316',  // orange-500
  hospital_capacity: '#3b82f6', // blue-500
  unattributed: '#71717a',      // zinc-500
}

interface Props {
  stats: DelayAttributionStats[]
}

const SIZE = 120         // SVG viewport size
const STROKE_W = 18      // donut ring width
const R = (SIZE - STROKE_W) / 2
const CIRCUMFERENCE = 2 * Math.PI * R
const CENTER = SIZE / 2

/**
 * Renders an SVG donut chart where each arc segment represents the
 * share of total delayed time per attribution category.
 * Gap-free — segments are placed back-to-back with a 2px gap between.
 */
export const AttributionDonutChart = memo(function AttributionDonutChart({ stats }: Props) {
  const grandTotal = stats.reduce((s, r) => s + r.totalDelayedMs, 0)
  if (grandTotal === 0) return null

  const GAP = 3 // px gap between segments in SVG units
  let cumulativeOffset = 0

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={SIZE}
      height={SIZE}
      aria-label="Delay attribution donut chart"
      role="img"
    >
      {/* Background track */}
      <circle
        cx={CENTER}
        cy={CENTER}
        r={R}
        fill="none"
        stroke="#27272a"
        strokeWidth={STROKE_W}
      />

      {stats.map((stat) => {
        if (stat.totalDelayedMs === 0) return null

        const fraction = stat.totalDelayedMs / grandTotal
        const arcLength = fraction * CIRCUMFERENCE - GAP
        const dashArray = `${Math.max(0, arcLength)} ${CIRCUMFERENCE}`
        const dashOffset = -cumulativeOffset

        cumulativeOffset += fraction * CIRCUMFERENCE

        return (
          <circle
            key={stat.attribution}
            cx={CENTER}
            cy={CENTER}
            r={R}
            fill="none"
            stroke={STROKE_COLORS[stat.attribution]}
            strokeWidth={STROKE_W}
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
            strokeLinecap="butt"
            // SVG draws from 3 o'clock; rotate to start at 12 o'clock
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
          />
        )
      })}

      {/* Centre label — show total incidents */}
      <text
        x={CENTER}
        y={CENTER - 6}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-white"
        style={{ fontSize: 18, fontWeight: 700, fontFamily: 'inherit' }}
      >
        {stats.reduce((s, r) => s + r.incidentCount, 0)}
      </text>
      <text
        x={CENTER}
        y={CENTER + 12}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-zinc-400"
        style={{ fontSize: 9, fontFamily: 'inherit' }}
      >
        incidents
      </text>
    </svg>
  )
})
