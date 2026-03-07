// LosKpiCards — Summary stat cards for Length-of-Stay
// EPIC 10: Management Report Dashboard
// US-10.x: Average Time Patients Spend in Emergency Ward

import { memo } from 'react'
import { Card, CardContent, CardHeader, CardDescription } from '@/shared/components/ui/card'
import { Clock, Users, TrendingUp, TrendingDown, Target } from 'lucide-react'
import { formatElapsedTime } from '../lib/utils'
import { cn } from '@/shared/lib/utils'
import type { LosSummary } from '../lib/los-queries'

interface LosKpiCardsProps {
  summary: LosSummary
}

/**
 * Whether the average LoS is over target (red), within 20% of target (amber),
 * or on/under target (green). Returns a Tailwind colour token.
 */
function getTargetStatus(
  averageLosMs: number,
  targetLosMs: number | null
): 'over' | 'near' | 'ok' | 'none' {
  if (targetLosMs === null) return 'none'
  if (averageLosMs > targetLosMs) return 'over'
  if (averageLosMs > targetLosMs * 0.8) return 'near'
  return 'ok'
}

const TARGET_STATUS_CLASSES = {
  over: 'text-red-400',
  near: 'text-amber-400',
  ok: 'text-emerald-400',
  none: 'text-foreground',
}

export const LosKpiCards = memo(function LosKpiCards({ summary }: LosKpiCardsProps) {
  const targetStatus = getTargetStatus(summary.averageLosMs, summary.targetLosMs)
  const avgClass = TARGET_STATUS_CLASSES[targetStatus]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {/* Average LoS — primary metric */}
      <Card className="col-span-2 sm:col-span-1 bg-card border-border">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardDescription className="text-xs text-muted-foreground uppercase">Avg Length of Stay</CardDescription>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={cn('text-2xl font-bold font-mono', avgClass)}>
            {summary.totalPatients === 0 ? '—' : formatElapsedTime(summary.averageLosMs)}
          </div>
          {summary.targetLosMs !== null && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Target: {formatElapsedTime(summary.targetLosMs)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Total patients */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardDescription className="text-xs text-muted-foreground uppercase">Patients</CardDescription>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{summary.totalPatients}</div>
          <p className="text-[10px] text-muted-foreground mt-1">In selected period</p>
        </CardContent>
      </Card>

      {/* Median */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardDescription className="text-xs text-muted-foreground uppercase">Median (p50)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-foreground font-mono">
            {summary.medianLosMs !== null ? formatElapsedTime(summary.medianLosMs) : '—'}
          </div>
        </CardContent>
      </Card>

      {/* p75 */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardDescription className="text-xs text-muted-foreground uppercase">p75</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-foreground font-mono">
            {summary.p75LosMs !== null ? formatElapsedTime(summary.p75LosMs) : '—'}
          </div>
        </CardContent>
      </Card>

      {/* Min */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardDescription className="text-xs text-muted-foreground uppercase">Min</CardDescription>
          <TrendingDown className="h-4 w-4 text-emerald-600" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-emerald-400 font-mono">
            {summary.minLosMs !== null ? formatElapsedTime(summary.minLosMs) : '—'}
          </div>
        </CardContent>
      </Card>

      {/* Max */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardDescription className="text-xs text-muted-foreground uppercase">Max</CardDescription>
          <TrendingUp className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-red-400 font-mono">
            {summary.maxLosMs !== null ? formatElapsedTime(summary.maxLosMs) : '—'}
          </div>
        </CardContent>
      </Card>

      {/* Target status badge — only shown when a target is configured */}
      {summary.targetLosMs !== null && (
        <Card className={cn(
          'col-span-2 sm:col-span-1 bg-card border-border',
          targetStatus === 'over' && 'border-red-800 bg-red-950/20',
          targetStatus === 'near' && 'border-amber-800 bg-amber-950/20',
          targetStatus === 'ok' && 'border-emerald-800 bg-emerald-950/20',
        )}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs text-muted-foreground uppercase">vs Target</CardDescription>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn('text-xl font-bold font-mono', avgClass)}>
              {targetStatus === 'ok' && '✓ On Track'}
              {targetStatus === 'near' && '⚠ Near Limit'}
              {targetStatus === 'over' && '✗ Over Target'}
            </div>
            {summary.totalPatients > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {targetStatus === 'over'
                  ? `+${formatElapsedTime(summary.averageLosMs - summary.targetLosMs)} over`
                  : `${formatElapsedTime(summary.targetLosMs - summary.averageLosMs)} remaining`}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
})
