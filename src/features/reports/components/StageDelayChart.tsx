'use client'
// Stage Delay Bar Chart — US-10.5
// Shows average duration per stage, sorted descending, bottleneck highlighted.

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { StageDelay } from '../types/report'

interface StageDelayChartProps {
  stageDelays: StageDelay[]
}

function msToMinLabel(ms: number): string {
  const min = Math.round(ms / 60_000)
  if (min < 60) return `${min}m`
  return `${Math.floor(min / 60)}h ${min % 60}m`
}

interface TooltipPayloadItem {
  payload: StageDelay & { avgDurationMs: number }
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
}) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-zinc-100 mb-1">{d.stageName}</p>
      <p className="text-zinc-400">Avg duration: <span className="text-white font-mono">{msToMinLabel(d.avgDurationMs)}</span></p>
      <p className="text-zinc-400">Transitions: <span className="text-white">{d.transitionCount}</span></p>
      {d.isBottleneck && <p className="text-red-400 font-medium mt-1">⚠ Bottleneck stage</p>}
    </div>
  )
}

export function StageDelayChart({ stageDelays }: StageDelayChartProps) {
  if (stageDelays.length === 0) {
    return (
      <p className="text-center text-zinc-500 text-sm py-8">No stage data for this period.</p>
    )
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={stageDelays}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v) => msToMinLabel(v as number)}
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            axisLine={{ stroke: '#52525b' }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="stageName"
            width={90}
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#27272a' }} />
          <Bar dataKey="avgDurationMs" radius={[0, 4, 4, 0]} maxBarSize={28}>
            {stageDelays.map((entry) => (
              <Cell
                key={entry.stageId}
                fill={entry.isBottleneck ? '#ef4444' : '#3b82f6'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
