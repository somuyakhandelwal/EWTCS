'use client'
// DelayedPatientGauge — Semi-circle SVG gauge showing delay %
// US-10.3: Percentage of Delayed Patients
// Epic 10: Management Report Dashboard
//
// Pure SVG — no external chart library required.

import { memo, useState } from 'react'
import { cn } from '@/shared/lib/utils'

interface DelayedPatientGaugeProps {
  /** 0–100 current percentage */
  pct: number
  /** 0–100 target percentage — null hides target marker */
  targetPct: number | null
  className?: string
}

// Semi-circle geometry
const W = 200
const H = 110
const CX = W / 2
const CY = H - 10
const R = 85
const STROKE_W = 16

// Arc drawing helpers
function polarToXY(angleDeg: number, r: number) {
  const rad = ((angleDeg - 180) * Math.PI) / 180
  return {
    x: CX + r * Math.cos(rad),
    y: CY + r * Math.sin(rad),
  }
}

function describeArc(startDeg: number, endDeg: number, r: number) {
  const start = polarToXY(startDeg, r)
  const end = polarToXY(endDeg, r)
  const largeArc = endDeg - startDeg > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

function getColor(pct: number, targetPct: number | null): string {
  if (targetPct === null) return '#3b82f6' // blue — no target configured
  if (pct <= targetPct) return '#22c55e'    // green — on target
  if (pct <= targetPct * 1.25) return '#f59e0b' // amber — 25% over target
  return '#ef4444'                           // red — significantly over
}

export const DelayedPatientGauge = memo(function DelayedPatientGauge({
  pct,
  targetPct,
  className,
}: DelayedPatientGaugeProps) {
  const [pinHovered, setPinHovered] = useState(false)
  const clampedPct = Math.max(0, Math.min(100, pct))
  // 0% → 0°, 100% → 180° (semi-circle)
  const fillDeg = (clampedPct / 100) * 180
  const color = getColor(clampedPct, targetPct)

  // target marker angle
  const targetDeg = targetPct !== null ? (Math.min(targetPct, 100) / 100) * 180 : null
  const targetPos = targetDeg !== null ? polarToXY(targetDeg, R) : null

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      className={cn('overflow-visible', className)}
      aria-label={`Delayed patients: ${clampedPct}%`}
      role="img"
    >
      {/* Background track */}
      <path
        d={describeArc(0, 180, R)}
        fill="none"
        stroke="#27272a"
        strokeWidth={STROKE_W}
        strokeLinecap="butt"
      />

      {/* Filled arc */}
      {fillDeg > 0 && (
        <path
          d={describeArc(0, fillDeg, R)}
          fill="none"
          stroke={color}
          strokeWidth={STROKE_W}
          strokeLinecap="butt"
        />
      )}

      {/* Target marker pin */}
      {targetPos && (
        <g
          style={{ cursor: 'default' }}
          onMouseEnter={() => setPinHovered(true)}
          onMouseLeave={() => setPinHovered(false)}
        >
          <circle
            cx={targetPos.x}
            cy={targetPos.y}
            r={pinHovered ? 7 : 5}
            fill="#f59e0b"
            stroke="#1c1917"
            strokeWidth={2}
            style={{ transition: 'r 0.15s' }}
            aria-label={`Target: ${targetPct}%`}
          />
          {pinHovered && (
            <>
              <rect
                x={targetPos.x - 36}
                y={targetPos.y - 26}
                width={72}
                height={18}
                rx={4}
                fill="#3f3f46"
                stroke="#52525b"
                strokeWidth={1}
              />
              <text
                x={targetPos.x}
                y={targetPos.y - 13}
                textAnchor="middle"
                style={{ fontSize: 10, fill: '#fbbf24', fontFamily: 'inherit', fontWeight: 600 }}
              >
                Target: {targetPct}%
              </text>
            </>
          )}
        </g>
      )}

      {/* Centre label */}
      <text
        x={CX}
        y={CY - 4}
        textAnchor="middle"
        style={{ fontSize: 28, fontWeight: 700, fontFamily: 'inherit', fill: color }}
      >
        {clampedPct.toFixed(1)}%
      </text>
      <text
        x={CX}
        y={CY + 14}
        textAnchor="middle"
        style={{ fontSize: 10, fill: '#a1a1aa', fontFamily: 'inherit' }}
      >
        delayed patients
      </text>

      {/* Scale labels */}
      <text
        x={CX - R - 10}
        y={CY + 4}
        textAnchor="end"
        style={{ fontSize: 9, fill: '#52525b', fontFamily: 'inherit' }}
      >
        0%
      </text>
      <text
        x={CX + R + 10}
        y={CY + 4}
        textAnchor="start"
        style={{ fontSize: 9, fill: '#52525b', fontFamily: 'inherit' }}
      >
        100%
      </text>
    </svg>
  )
})
