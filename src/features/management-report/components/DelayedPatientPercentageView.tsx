'use client'
// DelayedPatientPercentageView — US-10.3
// Epic 10: Management Report Dashboard
//
// Displays the % of patients who exceeded the delay threshold,
// rendered as a semi-circle SVG gauge + daily trend bars + configurable target.

import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
} from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { formatDuration } from '@/features/bed-dashboard/lib/duration-formatters'
import {
  useDelayedPatientsData,
  PRESETS,
} from '../hooks/useDelayedPatientsData'
import { DelayedPatientGauge } from './DelayedPatientGauge'
import { DelayedPatientStatsCard } from './DelayedPatientStatsCard'
import { DelayedPatientTrendCard } from './DelayedPatientTrendCard'
import { DelayedPatientTargetConfig } from './DelayedPatientTargetConfig'
import type { Shift } from '@/features/shift-management/types/shift.types'
import { formatShiftTime } from '@/features/shift-management/lib/shift-format'
import { ExportReportButton } from '@/features/export/components/ExportReportButton'

interface DelayedPatientPercentageViewProps {
  shifts: Shift[]
  readOnly?: boolean
  role?: string
  className?: string
}

export function DelayedPatientPercentageView({
  shifts,
  readOnly = false,
  role,
  className,
}: DelayedPatientPercentageViewProps) {
  const {
    preset, setPreset,
    selectedShiftId, setSelectedShiftId,
    selectedPreset,
    summary, loading, error, lastRefreshed,
    reload,
  } = useDelayedPatientsData()

  const canConfigureTarget = role === 'admin' && !readOnly

  const shiftLabel =
    selectedShiftId === 'all'
      ? 'All Shifts'
      : shifts.find((s) => s.id === selectedShiftId)?.name ?? 'Unknown'

  return (
    <div className={cn('space-y-4', className)} data-export-id="export-delayed">
      {/* Section header + toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-foreground">
            Delayed Patients %
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Patients exceeding the configured stay threshold ·{' '}
            {summary ? formatDuration(summary.thresholdMs) + ' threshold' : '…'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Preset buttons */}
          {PRESETS.map((p) => (
            <Button
              key={p.value}
              size="sm"
              variant={preset === p.value ? 'default' : 'outline'}
              onClick={() => setPreset(p.value)}
            >
              {p.label}
            </Button>
          ))}

          {/* Shift filter */}
          {shifts.length > 0 && (
            <select
              value={selectedShiftId}
              onChange={(e) => setSelectedShiftId(e.target.value)}
              className={cn(
                'h-9 rounded-md border border-border bg-card px-3 py-1',
                'text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500'
              )}
            >
              <option value="all">All Shifts</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({formatShiftTime(s.start_time, s.end_time)})
                </option>
              ))}
            </select>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={reload}
            disabled={loading || readOnly}
            title="Refresh"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
          <ExportReportButton
            scope="delayed"
            pdfSections={[{ exportId: 'export-delayed', title: 'Delayed Patients %' }]}
            pdfTitle="Delayed Patients Report"
            shiftId={selectedShiftId}
            label="Export"
            disabled={readOnly}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-800 bg-red-950/40">
          <CardContent className="pt-4 flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </CardContent>
        </Card>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gauge card */}
        <Card className="border-border bg-card flex flex-col items-center justify-center py-6">
          <CardHeader className="pb-2 text-center">
            <CardDescription className="text-xs text-muted-foreground uppercase">
              {selectedPreset.label} · {shiftLabel}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-2">
            {loading ? (
              <div className="h-28 w-48 animate-pulse rounded bg-muted" />
            ) : (
              <DelayedPatientGauge
                pct={summary?.delayPct ?? 0}
                targetPct={summary?.targetPct ?? null}
              />
            )}

            {canConfigureTarget && (
              <div className="mt-1">
                <DelayedPatientTargetConfig
                  targetPct={summary?.targetPct ?? null}
                  onSaved={reload}
                />
              </div>
            )}

            {lastRefreshed && (
              <p className="text-[10px] text-zinc-600">
                Updated {lastRefreshed.toLocaleTimeString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Stats card */}
        <DelayedPatientStatsCard summary={summary} loading={loading} />

        {/* Trend card */}
        <DelayedPatientTrendCard
          trend={summary?.trend ?? []}
          targetPct={summary?.targetPct ?? null}
          loading={loading}
        />
      </div>
    </div>
  )
}
