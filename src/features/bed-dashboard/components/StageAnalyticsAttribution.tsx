'use client'
// Delay Attribution Breakdown Component
// Epic 3: Time Tracking & Stage Logging (US-3.4)
// Shows delay totals split by Emergency Staff vs Hospital Capacity
// Includes SVG donut chart (AC: "Pie chart or breakdown is available")

import { memo } from 'react'
import { AlertTriangle, Building2, HelpCircle } from 'lucide-react'
import { Card } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'
import { ATTRIBUTION_COLORS } from '../lib/delay-attribution-config'
import type { DelayAttributionStats } from '../lib/stage-analytics'
import { AttributionDonutChart } from './AttributionDonutChart'

interface Props {
  stats: DelayAttributionStats[] | null
}

/** Convert milliseconds to "Xh Ym" */
function formatHours(ms: number): string {
  if (ms <= 0) return '0m'
  const totalMinutes = Math.floor(ms / 60_000)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

const ICONS = {
  emergency_staff: AlertTriangle,
  hospital_capacity: Building2,
  unattributed: HelpCircle,
} as const

const DESCRIPTIONS: Record<string, string> = {
  emergency_staff: 'Delays in Initial Investigation, Initial Treatment, Drugs/Test & Observation',
  hospital_capacity: 'Decision Made delays caused by unavailable beds upstairs',
  unattributed: 'Decision Made delays without a bed-availability reason recorded',
}

export const StageAnalyticsAttribution = memo(function StageAnalyticsAttribution({
  stats,
}: Props) {
  if (!stats) return null

  const hasAnyDelay = stats.some((s) => s.totalDelayedMs > 0)

  return (
    <Card className="bg-card border-border p-6 space-y-5">
      {/* Section header */}
      <div>
        <h3 className="text-base font-semibold text-foreground">Delay Root-Cause Attribution</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Classifies delayed patient time into operational categories
        </p>
      </div>

      {!hasAnyDelay ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No delays recorded in the selected period.
        </p>
      ) : (
        <div className="space-y-4">
          {/* Donut chart + legend row */}
          <div className="flex items-center gap-6">
            <div className="shrink-0">
              <AttributionDonutChart stats={stats} />
            </div>

            {/* Legend */}
            <div className="flex flex-col gap-2 min-w-0">
              {stats
                .filter((s) => s.totalDelayedMs > 0)
                .map((stat) => {
                  const colors = ATTRIBUTION_COLORS[stat.attribution]
                  return (
                    <div key={stat.attribution} className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn('h-3 w-3 rounded-sm shrink-0', colors.bar)}
                        aria-hidden="true"
                      />
                      <span className={cn('text-xs font-medium truncate', colors.text)}>
                        {stat.label}
                      </span>
                      <span className={cn('text-xs font-bold tabular-nums ml-auto pl-2', colors.text)}>
                        {stat.percentage}%
                      </span>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* Breakdown bars */}
          {stats.map((stat) => {
            const colors = ATTRIBUTION_COLORS[stat.attribution]
            const Icon = ICONS[stat.attribution]
            return (
              <div key={stat.attribution} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={cn('h-4 w-4 shrink-0', colors.text)} />
                    <span className={cn('text-sm font-medium truncate', colors.text)}>
                      {stat.label}
                    </span>
                    <span className="text-xs text-muted-foreground hidden sm:block truncate">
                      — {DESCRIPTIONS[stat.attribution]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {stat.incidentCount} incident{stat.incidentCount !== 1 ? 's' : ''}
                    </span>
                    <span className={cn('text-sm font-bold tabular-nums', colors.text)}>
                      {formatHours(stat.totalDelayedMs)}
                    </span>
                    <span
                      className={cn(
                        'text-xs font-semibold px-1.5 py-0.5 rounded',
                        colors.bg,
                        colors.text,
                        colors.border,
                        'border'
                      )}
                    >
                      {stat.percentage}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', colors.bar)}
                    style={{ width: `${stat.percentage}%` }}
                  />
                </div>
              </div>
            )
          })}

          {/* Summary totals row */}
          <div className="pt-3 border-t border-border flex flex-wrap gap-4">
            {stats
              .filter((s) => s.totalDelayedMs > 0)
              .map((stat) => {
                const colors = ATTRIBUTION_COLORS[stat.attribution]
                return (
                  <div
                    key={stat.attribution}
                    className={cn(
                      'flex-1 min-w-[8rem] rounded-lg px-4 py-3 border',
                      colors.bg,
                      colors.border
                    )}
                  >
                    <p className={cn('text-xs font-medium', colors.text)}>{stat.label}</p>
                    <p className={cn('text-xl font-bold mt-0.5', colors.text)}>
                      {formatHours(stat.totalDelayedMs)}
                    </p>
                    <p className="text-xs text-muted-foreground">{stat.percentage}% of total delays</p>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </Card>
  )
})
