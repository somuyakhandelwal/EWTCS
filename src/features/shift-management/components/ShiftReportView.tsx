'use client'
// Shift Report View (US-8.3)
// Epic 8: Shift Management
//
// Displays per-shift metrics (patients, avg stay, delayed stages) with shift
// selector and date-range presets. MetricCard UI lives in ShiftMetricCard.tsx.

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { AlertCircle, RefreshCw, Clock, Users, AlertTriangle } from 'lucide-react'
import { fetchShiftReport } from '../actions/shift-analytics-actions'
import { formatDuration } from '@/shared/lib/duration-formatters'
import { formatShiftTime } from '../lib/shift-format'
import { cn } from '@/shared/lib/utils'
import { ShiftMetricCard } from './ShiftMetricCard'
import type { ShiftPerformanceRow } from '@/shared/types/report.types'
import type { Shift } from '../types/shift.types'

const PRESET_HOURS = [
  { label: '24h', hours: 24 },
  { label: '7d',  hours: 24 * 7 },
  { label: '30d', hours: 24 * 30 },
]

interface ShiftReportViewProps {
  shifts: Shift[]
  readOnly?: boolean
  className?: string
}

export function ShiftReportView({ shifts, readOnly = false, className }: ShiftReportViewProps) {
  const [selectedShiftId, setSelectedShiftId] = useState(shifts[0]?.id ?? '')
  const [hoursBack, setHoursBack] = useState(24)
  const [report, setReport] = useState<ShiftPerformanceRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!selectedShiftId) return
    setLoading(true)
    setError(null)
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - hoursBack * 3_600_000)
    const result = await fetchShiftReport({ shiftId: selectedShiftId, startDate, endDate })
    if (result.success && result.data) {
      setReport(result.data)
    } else {
      setError(result.error ?? 'Failed to load shift report')
    }
    setLoading(false)
  }, [selectedShiftId, hoursBack])

  useEffect(() => { void load() }, [load])

  const selectedShift = shifts.find(s => s.id === selectedShiftId)

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Shift Performance Report</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Metrics for a selected shift — patients, avg stay, and delays
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedShiftId}
            onChange={e => setSelectedShiftId(e.target.value)}
            className="h-9 rounded-md border border-border bg-card px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {shifts.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({formatShiftTime(s.start_time, s.end_time)})
              </option>
            ))}
          </select>
          {PRESET_HOURS.map(p => (
            <Button key={p.label} size="sm"
              variant={hoursBack === p.hours ? 'default' : 'outline'}
              onClick={() => setHoursBack(p.hours)}>
              {p.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => void load()}
            disabled={loading || readOnly} title="Refresh">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {selectedShift && (
        <div className="text-sm text-muted-foreground">
          Showing: <span className="font-medium text-card-foreground">{selectedShift.name}</span>{' '}
          shift ({formatShiftTime(selectedShift.start_time, selectedShift.end_time)})
          {selectedShift.crosses_midnight && (
            <span className="ml-1 text-xs text-amber-400">(crosses midnight)</span>
          )}
        </div>
      )}

      {error && (
        <Card className="border-red-800 bg-red-950/40">
          <CardContent className="pt-4 flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : report ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ShiftMetricCard icon={<Users className="h-3.5 w-3.5" />}
            label="Patients Treated" value={String(report.patientsTreated)}
            sub="Discharged in this shift" />
          <ShiftMetricCard icon={<Clock className="h-3.5 w-3.5" />}
            label="Avg. Stay Duration" value={formatDuration(report.avgTatMs)}
            sub="Admission to discharge" />
          <ShiftMetricCard icon={<AlertTriangle className="h-3.5 w-3.5" />}
            label="Delayed Stages" value={String(report.delayCount)}
            sub="Stage transitions > 3 hours"
            accent={report.delayCount > 0 ? 'text-red-400' : 'text-green-400'} />
        </div>
      ) : null}
    </div>
  )
}
