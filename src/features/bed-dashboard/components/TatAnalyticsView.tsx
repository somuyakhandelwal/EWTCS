// TAT Analytics View Component
// US-2.4: Track Bed Cleaning and Turnaround Time
// Displays turnaround time analytics for supervisor/admin

'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { fetchTatSummary, fetchTatRecords } from '../actions/tat-actions'
import { formatDuration } from '../lib/analytics-utils'
import type { TatRecord, TatSummary } from '../types/bed'
import { AlertCircle, Download } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { logger } from '@/shared/config/logger'

interface TatAnalyticsViewProps {
  className?: string
}

export function TatAnalyticsView({ className }: TatAnalyticsViewProps) {
  const [summary, setSummary] = useState<TatSummary | null>(null)
  const [records, setRecords] = useState<TatRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoursBack, setHoursBack] = useState(24)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [summaryResult, recordsResult] = await Promise.all([
        fetchTatSummary(hoursBack),
        fetchTatRecords(hoursBack),
      ])
      if (!summaryResult.success) throw new Error(summaryResult.error)
      if (!recordsResult.success) throw new Error(recordsResult.error)
      setSummary(summaryResult.data || null)
      setRecords(recordsResult.data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load TAT data'
      setError(message)
      logger.error('Failed to load TAT analytics', err as Error)
    } finally {
      setLoading(false)
    }
  }, [hoursBack])

  useEffect(() => { void loadData() }, [loadData])

  const handleExportCSV = useCallback(() => {
    if (records.length === 0) return
    const header = 'Bed,Discharge Start,Cleaning Start,Cleaning End,TAT (min),Cleaning (min)\n'
    const rows = records.map(r => {
      const tat = Math.round(r.tatMs / 60000)
      const cleaning = r.cleaningDurationMs ? Math.round(r.cleaningDurationMs / 60000) : 'N/A'
      return `${r.bedNumber},${r.dischargeStartTime},${r.cleaningStartTime || 'N/A'},${r.cleaningEndTime || 'N/A'},${tat},${cleaning}`
    }).join('\n')

    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `tat-report-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }, [records])

  if (loading) {
    return <div className={cn('h-40 rounded-lg bg-zinc-100 animate-pulse', className)} />
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Error Loading TAT Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" onClick={loadData} className="mt-4">Retry</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Turnaround Time Analytics</h2>
          <p className="text-sm text-zinc-600 mt-1">
            Bed turnaround: Discharge Process → Cleaning → Empty
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[24, 48, 168].map(h => (
            <Button key={h} size="sm" variant={hoursBack === h ? 'default' : 'outline'}
              onClick={() => setHoursBack(h)}>
              {h === 168 ? '7d' : `${h}h`}
            </Button>
          ))}
          <Button onClick={handleExportCSV} disabled={records.length === 0}
            variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <SummaryCard label="Completed" value={String(summary.totalCompleted)} />
          <SummaryCard label="Avg TAT" value={formatDuration(summary.averageTatMs)} />
          <SummaryCard label="Median TAT" value={formatDuration(summary.medianTatMs)} />
          <SummaryCard label="Min TAT" value={formatDuration(summary.minTatMs)} />
          <SummaryCard label="Max TAT" value={formatDuration(summary.maxTatMs)} />
          <SummaryCard label="Avg Cleaning" value={formatDuration(summary.averageCleaningMs)} />
        </div>
      )}

      {/* Records Table */}
      {records.length === 0 ? (
        <p className="text-center text-zinc-400 py-8">
          No completed turnaround cycles in the last {hoursBack}h.
        </p>
      ) : (
        <TatRecordsTable records={records} />
      )}
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs">{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

function TatRecordsTable({ records }: { records: TatRecord[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Bed</th>
            <th className="px-4 py-2 text-left font-medium">TAT</th>
            <th className="px-4 py-2 text-left font-medium">Cleaning</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr key={`${r.bedId}-${i}`} className="border-t border-zinc-100">
              <td className="px-4 py-2 font-medium">{r.bedNumber}</td>
              <td className="px-4 py-2">{formatDuration(r.tatMs)}</td>
              <td className="px-4 py-2">
                {r.cleaningDurationMs ? formatDuration(r.cleaningDurationMs) : 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
