'use client'
// Shift Comparison View (US-8.4)
// Epic 8: Shift Management
//
// Container: toolbar (date presets, CSV export, refresh) + delegates table
// rendering to ShiftComparisonTable and CSV logic to shift-comparison-csv.

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { fetchShiftComparison } from '../actions/shift-analytics-actions'
import { rowsToCsv, downloadCsv } from '../lib/shift-comparison-csv'
import { ShiftComparisonTable } from './ShiftComparisonTable'
import { cn } from '@/shared/lib/utils'
import type { ShiftComparisonReport } from '@/features/management-report/types/report.types'

const PRESET_HOURS = [
  { label: '24h', hours: 24 },
  { label: '7d',  hours: 24 * 7 },
  { label: '30d', hours: 24 * 30 },
]

interface ShiftComparisonViewProps {
  readOnly?: boolean
  className?: string
}

export function ShiftComparisonView({ readOnly = false, className }: ShiftComparisonViewProps) {
  const [hoursBack, setHoursBack] = useState(24)
  const [report, setReport] = useState<ShiftComparisonReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - hoursBack * 3_600_000)
    const result = await fetchShiftComparison({ startDate, endDate })
    if (result.success && result.data) {
      setReport(result.data)
    } else {
      setError(result.error ?? 'Failed to load comparison')
    }
    setLoading(false)
  }, [hoursBack])

  useEffect(() => { void load() }, [load])

  const handleExport = () => {
    if (!report) return
    downloadCsv(rowsToCsv(report.rows), `shift-comparison-${new Date().toISOString().split('T')[0]}.csv`)
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Shift Performance Comparison</h2>
          <p className="text-sm text-zinc-400 mt-0.5">
            Side-by-side throughput, timing, and delay metrics for all shifts
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PRESET_HOURS.map(p => (
            <Button key={p.label} size="sm"
              variant={hoursBack === p.hours ? 'default' : 'outline'}
              onClick={() => setHoursBack(p.hours)}>
              {p.label}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={handleExport}
            disabled={!report || loading || readOnly}>
            Export CSV
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void load()}
            disabled={loading} title="Refresh">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-800 bg-red-950/40">
          <CardContent className="pt-4 flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
          </CardContent>
        </Card>
      )}

      <ShiftComparisonTable report={report} loading={loading} />

      {/* Legend */}
      {report && !loading && (
        <p className="text-xs text-zinc-500">
          Delays = stage transitions exceeding 3 hours.{' '}
          <span className="text-green-400">Best</span> = highest throughput with fewest delays.{' '}
          <span className="text-red-400">Worst</span> = lowest throughput among active shifts with patients.
        </p>
      )}
    </div>
  )
}
