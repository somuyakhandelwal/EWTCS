// Report KPI Cards
// EPIC 10: US-10.1 (total patients), US-10.2 (avg TAT), US-10.3 (delay %)

import { Users, Clock, AlertTriangle } from 'lucide-react'
import type { ReportMetrics } from '../types/report'

interface ReportKPICardsProps {
  metrics: ReportMetrics
}

function msToHM(ms: number | null): string {
  if (ms === null) return '—'
  const totalMin = Math.round(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

/** CSS semicircle gauge for delay percentage (US-10.3) */
export function DelayGauge({ rate, target }: { rate: number; target: number }) {
  const pct     = Math.min(rate * 100, 100)
  const tgtPct  = Math.min(target * 100, 100)
  const isOver  = rate > target
  const colour  = isOver ? '#ef4444' : '#22c55e'   // red / green

  // SVG arc gauge 0-180°
  const cx = 60, cy = 60, r = 50
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const xOnArc = (deg: number) => cx + r * Math.cos(toRad(180 - deg))
  const yOnArc = (deg: number) => cy - r * Math.sin(toRad(180 - deg))
  const arcDeg = pct * 1.8   // 0-100 → 0-180°

  const d = [
    `M ${xOnArc(0)} ${yOnArc(0)}`,
    `A ${r} ${r} 0 ${arcDeg > 90 ? 1 : 0} 1 ${xOnArc(arcDeg)} ${yOnArc(arcDeg)}`,
  ].join(' ')

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="70" viewBox="0 0 120 70" aria-label={`Delay rate: ${pct.toFixed(1)}%`}>
        {/* Track */}
        <path
          d={`M ${xOnArc(0)} ${yOnArc(0)} A ${r} ${r} 0 0 1 ${xOnArc(180)} ${yOnArc(180)}`}
          fill="none" stroke="#3f3f46" strokeWidth="10" strokeLinecap="round"
        />
        {/* Value arc */}
        {arcDeg > 0 && (
          <path d={d} fill="none" stroke={colour} strokeWidth="10" strokeLinecap="round" />
        )}
        {/* Target tick */}
        <line
          x1={xOnArc(tgtPct * 1.8 - 2)} y1={yOnArc(tgtPct * 1.8 - 2)}
          x2={xOnArc(tgtPct * 1.8 + 2)} y2={yOnArc(tgtPct * 1.8 + 2)}
          stroke="#fbbf24" strokeWidth="3"
        />
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize="14" fontWeight="700" fill={colour}>
          {pct.toFixed(1)}%
        </text>
        <text x={cx} y={cy + 6} textAnchor="middle" fontSize="9" fill="#71717a">
          target {tgtPct.toFixed(0)}%
        </text>
      </svg>
    </div>
  )
}

export function ReportKPICards({ metrics }: ReportKPICardsProps) {
  const delayPct    = (metrics.delayRate * 100).toFixed(1)
  const isOverTarget = metrics.delayRate > metrics.targetDelayRate

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {/* US-10.1: Total patients */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-blue-900/30 border border-blue-800/50">
            <Users className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-xs text-zinc-400 uppercase tracking-wide font-medium">Total Patients</p>
        </div>
        <p className="text-4xl font-bold text-white">{metrics.totalPatients.toLocaleString()}</p>
        <p className="text-xs text-zinc-500 mt-1">Unique beds occupied in period</p>
      </div>

      {/* US-10.2: Average TAT */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-amber-900/30 border border-amber-800/50">
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-xs text-zinc-400 uppercase tracking-wide font-medium">Avg Time / Stage</p>
        </div>
        <p className="text-4xl font-bold text-white">{msToHM(metrics.avgTatMs)}</p>
        <p className="text-xs text-zinc-500 mt-1">Average stage turnaround time</p>
      </div>

      {/* US-10.3: Delay rate */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-lg border ${isOverTarget ? 'bg-red-900/30 border-red-800/50' : 'bg-green-900/30 border-green-800/50'}`}>
            <AlertTriangle className={`h-4 w-4 ${isOverTarget ? 'text-red-400' : 'text-green-400'}`} />
          </div>
          <p className="text-xs text-zinc-400 uppercase tracking-wide font-medium">Delayed Patients</p>
        </div>
        <div className="flex items-end gap-4">
          <p className={`text-4xl font-bold ${isOverTarget ? 'text-red-400' : 'text-green-400'}`}>
            {delayPct}%
          </p>
          <DelayGauge rate={metrics.delayRate} target={metrics.targetDelayRate} />
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          {metrics.delayedCount} delayed · target ≤{(metrics.targetDelayRate * 100).toFixed(0)}%
        </p>
      </div>
    </div>
  )
}
