// Legacy bed-to-bed turnaround analytics view.
// US-3.4: Track Bed Turnaround Time (Discharge → Next Admission)
// Kept for historical reporting; EPIC 25 workflow TAT lives in StageAnalyticsTAT.

'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { fetchFullCycleTatSummary, fetchFullCycleTatRecords } from '../actions/tat-cycle-actions'
import type { FullCycleTatSummary, FullCycleTatRecord } from '../types/bed'
import { FullCycleTatCards } from './FullCycleTatCards'
import { FullCycleTatTable } from './FullCycleTatTable'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { logger } from '@/shared/config/logger'

interface TatAnalyticsViewProps {
  className?: string
  readOnly?: boolean
}

export function TatAnalyticsView({ className, readOnly = false }: TatAnalyticsViewProps) {
  const [fullCycleSummary, setFullCycleSummary] = useState<FullCycleTatSummary | null>(null)
  const [fullCycleRecords, setFullCycleRecords] = useState<FullCycleTatRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoursBack, setHoursBack] = useState(24)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const startDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000)
      const [summaryResult, recordsResult] = await Promise.all([
        fetchFullCycleTatSummary({ startDate }),
        fetchFullCycleTatRecords({ startDate }),
      ])
      setFullCycleSummary(summaryResult.success ? (summaryResult.data ?? null) : null)
      setFullCycleRecords(recordsResult.success ? (recordsResult.data ?? []) : [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load TAT data'
      setError(message)
      logger.error('Failed to load full-cycle TAT analytics', err as Error)
    } finally {
      setLoading(false)
    }
  }, [hoursBack])

  useEffect(() => { void loadData() }, [loadData])

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
          <h2 className="text-2xl font-bold tracking-tight">Legacy Bed-to-Bed Turnaround</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Next-admission turnaround retained for historical reporting.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[24, 48, 168].map(h => (
            <Button key={h} size="sm" variant={hoursBack === h ? 'default' : 'outline'}
              onClick={() => setHoursBack(h)} disabled={readOnly}>
              {h === 168 ? '7d' : `${h}h`}
            </Button>
          ))}
        </div>
      </div>

      {fullCycleSummary && <FullCycleTatCards summary={fullCycleSummary} />}
      <FullCycleTatTable records={fullCycleRecords} />
    </div>
  )
}
