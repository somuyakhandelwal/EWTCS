'use client'
// Trend Line Chart — US-10.7
// Interactive dual-axis line chart: patient count + avg TAT over time.

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { DailyTrend } from '../types/report'

interface TrendChartProps {
  trend: DailyTrend[]
}

function msToMin(ms: number | null): number | null {
  return ms !== null ? Math.round(ms / 60_000) : null
}

interface TooltipPayload {
  name: string
  value: number | null
  color: string
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-zinc-100 mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-mono font-semibold">{p.value ?? '—'}
            {p.name === 'Avg TAT (min)' ? ' min' : ''}
          </span>
        </p>
      ))}
    </div>
  )
}

export function TrendChart({ trend }: TrendChartProps) {
  if (trend.length === 0) {
    return (
      <p className="text-center text-zinc-500 text-sm py-8">No trend data for this period.</p>
    )
  }

  const data = trend.map((t) => ({
    date:       t.date.slice(5),   // 'MM-DD' for compact labels
    Patients:   t.patientCount,
    'Avg TAT (min)': msToMin(t.avgTatMs),
    Delayed:    t.delayedCount,
  }))

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            axisLine={{ stroke: '#52525b' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: '#a1a1aa', paddingTop: 4 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="Patients"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="Avg TAT (min)"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="Delayed"
            stroke="#ef4444"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            dot={false}
            activeDot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
