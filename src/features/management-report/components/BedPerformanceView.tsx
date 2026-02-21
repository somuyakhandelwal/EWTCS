'use client'
// BedPerformanceView — US-10.4
// Epic 10: Management Report Dashboard
//
// Shows per-bed performance with a sortable table + horizontal bar chart.
// Outlier beds are highlighted; data can be exported as CSV.

import { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/shared/components/ui/card'
import { AlertCircle, BedDouble, AlertTriangle } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { formatDuration } from '@/features/bed-dashboard/lib/duration-formatters'
import { useBedPerformanceData } from '../hooks/useBedPerformanceData'
import { BedPerformanceTable } from './BedPerformanceTable'
import { BedPerformanceChart } from './BedPerformanceChart'
import { BedPerformanceToolbar } from './BedPerformanceToolbar'
import type { Shift } from '@/features/shift-management/types/shift.types'
import { ExportReportButton } from '@/features/export/components/ExportReportButton'

interface BedPerformanceViewProps {
  shifts: Shift[]
  readOnly?: boolean
  className?: string
}

export function BedPerformanceView({
  shifts,
  readOnly = false,
  className,
}: BedPerformanceViewProps) {
  const {
    preset, setPreset,
    selectedShiftId, setSelectedShiftId,
    selectedPreset,
    report, loading, error, lastRefreshed,
    sortField, sortDir, setSort,
    reload,
  } = useBedPerformanceData()

  const outlierCount = useMemo(
    () => report?.rows.filter((r) => r.isOutlier).length ?? 0,
    [report]
  )

  const chartRows = useMemo(
    () =>
      report
        ? [...report.rows]
            .filter((r) => r.patientsTreated > 0)
            .sort((a, b) => (b.avgDurationMs ?? 0) - (a.avgDurationMs ?? 0))
        : [],
    [report]
  )

  return (
    <div className={cn('space-y-4', className)} data-export-id="export-beds">
      {/* Header + toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-white">
            <BedDouble className="h-6 w-6 text-blue-400" />
            Bed-Wise Performance
          </h2>
          <p className="text-sm text-zinc-400 mt-0.5">
            Patients treated, average stay, and delay rate per bed
            {report && (
              <> ·{' '}
                <span className="text-zinc-500">
                  threshold {formatDuration(report.thresholdMs)}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <BedPerformanceToolbar
            preset={preset}
            setPreset={setPreset}
            shifts={shifts}
            selectedShiftId={selectedShiftId}
            setSelectedShiftId={setSelectedShiftId}
            loading={loading}
            readOnly={readOnly}
            onReload={reload}
          />
          <ExportReportButton
            scope="beds"
            pdfSections={[{ exportId: 'export-beds', title: 'Bed-Wise Performance' }]}
            pdfTitle="Bed-Wise Performance Report"
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

      {/* Outlier callout banner */}
      {!loading && outlierCount > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-600/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          <span>
            <strong>{outlierCount}</strong>{' '}
            {outlierCount === 1 ? 'bed' : 'beds'} flagged as outlier
            {outlierCount !== 1 ? 's' : ''} — higher than average stay duration or delay rate
          </span>
        </div>
      )}

      {/* Chart + Table */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-56 animate-pulse rounded-lg bg-zinc-800" />
          <div className="h-72 animate-pulse rounded-lg bg-zinc-800" />
        </div>
      ) : report && report.rows.length > 0 ? (
        <div className="space-y-6">
          {/* Bar chart */}
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white">Average Stay Duration per Bed</CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                {selectedPreset.label} range ·{' '}
                {report.overallAvgMs !== null
                  ? `Overall avg: ${formatDuration(report.overallAvgMs)}`
                  : 'No discharges in period'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-3 items-center mb-2 text-[10px] text-zinc-500">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-blue-500 opacity-85" /> Normal
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-amber-500 opacity-85" /> Outlier
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-red-500 opacity-85" /> High delay rate
                </span>
              </div>
              <BedPerformanceChart rows={chartRows} />
            </CardContent>
          </Card>

          {/* Sortable table */}
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white">Full Bed Breakdown</CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Click column headers to sort · {report.rows.length} beds
                {lastRefreshed && ` · Updated ${lastRefreshed.toLocaleTimeString()}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <BedPerformanceTable
                rows={report.rows}
                sortField={sortField}
                sortDir={sortDir}
                onSort={setSort}
                thresholdMs={report.thresholdMs}
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardContent className="pt-8 pb-8 flex items-center justify-center">
            <p className="text-zinc-500 text-sm">No beds found for the selected period</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
