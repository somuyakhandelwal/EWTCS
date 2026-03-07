'use client'

// StaffingHeatmap — patient volume heatmap by hour of day and day of week
// EPIC 10: Management Report Dashboard
// AC1: show volume by hour + day  AC2: colour intensity  AC3: interactive drill-down
// AC4: date-range filter          AC5: export as PNG

import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { AlertCircle, Download, RefreshCw } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useHeatmapData } from '../hooks/useHeatmapData'
import { exportHeatmapAsPng } from '../lib/heatmap-export'
import { HeatmapCell } from './HeatmapCell'
import { HeatmapDrillDown } from './HeatmapDrillDown'

const HOURS    = Array.from({ length: 24 }, (_, i) => i)
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface StaffingHeatmapProps {
  className?: string
}

export function StaffingHeatmap({ className }: StaffingHeatmapProps) {
  const {
    data, loading, error,
    filters, setFilters,
    drillDown, openDrillDown, closeDrillDown,
    reload,
  } = useHeatmapData()

  // Look up a cell count for the given DOW × hour (returns 0 if not present)
  function cellCount(dow: number, hour: number): number {
    return data?.cells.find(c => c.dayOfWeek === dow && c.hourOfDay === hour)?.count ?? 0
  }

  function handleDateChange(field: 'startDate' | 'endDate', value: string) {
    if (!value) {
      setFilters({ ...filters, [field]: undefined })
      return
    }
    // Bug fix: date inputs return 'YYYY-MM-DD' which parses as UTC midnight.
    // For endDate (inclusive) we advance to 23:59:59.999 UTC on that day so
    // the entire selected day is included in the query.
    const d = new Date(value)
    if (field === 'endDate') {
      d.setUTCHours(23, 59, 59, 999)
    }
    setFilters({ ...filters, [field]: d })
  }

  function handleExport() {
    if (data) exportHeatmapAsPng(data)
  }

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return <div className={cn('h-72 rounded-lg bg-card animate-pulse', className)} />
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <Card className={cn('border-red-900/50 bg-red-950/20', className)}>
        <CardContent className="pt-6">
          <p className="text-red-400 flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
          </p>
          <Button variant="outline" onClick={reload} className="mt-3 text-sm">Retry</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>

      {/* ── Title + controls ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Staffing Heatmap</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Patient admissions by day of week and hour of day
            {data && (
              <span className="ml-2 text-muted-foreground">— {data.totalAdmissions} total admissions</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            aria-label="Start date filter"
            onChange={e => handleDateChange('startDate', e.target.value)}
            className="text-xs bg-card border border-border text-card-foreground rounded px-2 py-1.5"
          />
          <span className="text-muted-foreground text-xs">to</span>
          <input
            type="date"
            aria-label="End date filter"
            onChange={e => handleDateChange('endDate', e.target.value)}
            className="text-xs bg-card border border-border text-card-foreground rounded px-2 py-1.5"
          />
          <Button size="sm" variant="outline" onClick={reload}
            className="text-card-foreground border-border hover:bg-muted">
            <RefreshCw className="h-3 w-3 mr-1" />Apply
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport}
            className="text-card-foreground border-border hover:bg-muted">
            <Download className="h-3 w-3 mr-1" />Export PNG
          </Button>
        </div>
      </div>

      {/* ── Heatmap grid ──────────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardContent className="pt-4 pb-5 overflow-x-auto">

          {/* Hour axis labels */}
          <div className="flex gap-0.5 mb-1 ml-10 min-w-max">
            {HOURS.map(h => (
              <div key={h} className="w-7 text-center text-[9px] text-muted-foreground shrink-0">
                {h % 3 === 0 ? String(h).padStart(2, '0') : ''}
              </div>
            ))}
          </div>

          {/* Day rows */}
          <div className="min-w-max">
            {DAY_ABBR.map((day, dow) => (
              <div key={dow} className="flex items-center gap-0.5 mb-0.5">
                <div className="w-9 text-[10px] text-muted-foreground text-right pr-2 shrink-0">{day}</div>
                {HOURS.map(hour => (
                  <div key={hour} className="w-7 shrink-0">
                    <HeatmapCell
                      count={cellCount(dow, hour)}
                      maxCount={data?.maxCount ?? 1}
                      label={`${day} ${String(hour).padStart(2, '0')}:00`}
                      onClick={() => openDrillDown(dow, hour)}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Colour legend */}
          <div className="flex items-center gap-1.5 mt-4">
            <span className="text-[10px] text-muted-foreground mr-1">Low</span>
            {[0.08, 0.25, 0.45, 0.65, 0.82, 1].map(v => (
              <div
                key={v}
                className="w-5 h-3 rounded-sm"
                style={{ backgroundColor: `rgba(59,130,246,${v})` }}
              />
            ))}
            <span className="text-[10px] text-muted-foreground ml-1">High</span>
          </div>

        </CardContent>
      </Card>

      {/* ── Drill-down modal ──────────────────────────────────────────────── */}
      {drillDown.dayOfWeek !== null && drillDown.hourOfDay !== null && (
        <HeatmapDrillDown
          dayOfWeek={drillDown.dayOfWeek}
          hourOfDay={drillDown.hourOfDay}
          records={drillDown.records}
          loading={drillDown.loading}
          onClose={closeDrillDown}
        />
      )}
    </div>
  )
}
