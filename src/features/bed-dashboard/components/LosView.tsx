'use client'
// LosView — Average Length of Stay analytics assembly
// EPIC 10: Management Report Dashboard / US-10.x

import { useState, useCallback, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { logger } from '@/shared/config/logger'
import { useLosData } from '../hooks/useLosData'
import { LosFilterBar } from './LosFilterBar'
import { LosKpiCards } from './LosKpiCards'
import { LosTrendChart } from './LosTrendChart'
import { LosTargetConfig } from './LosTargetConfig'
import { fetchLosTarget } from '../actions/los-actions'
import type { LosFilters } from '../lib/los-queries'

function defaultFilters(): LosFilters {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return { startDate: start, endDate: end }
}

interface LosViewProps {
  readOnly?: boolean
  role?: string
  className?: string
}

export function LosView({ readOnly = false, role, className }: LosViewProps) {
  const [filters, setFilters] = useState<LosFilters>(defaultFilters)
  const [targetMinutes, setTargetMinutes] = useState<number | null>(null)
  const { summary, trend, loading, error, reload } = useLosData(filters)

  const loadTarget = useCallback(async () => {
    if (role !== 'admin') return
    try {
      const result = await fetchLosTarget()
      if (result.success) setTargetMinutes(result.targetMinutes ?? null)
    } catch (err) {
      logger.error('Failed to load LoS target for config', err as Error)
    }
  }, [role])

  useEffect(() => { void loadTarget() }, [loadTarget])

  const handleTargetSaved = useCallback(() => {
    void loadTarget()
    reload()
  }, [loadTarget, reload])

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="h-8 w-72 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-56 rounded-lg bg-muted animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className={cn('bg-card border-red-900', className)}>
        <CardHeader>
          <CardTitle className="text-red-400 flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4" />
            Error Loading Length of Stay Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-red-300">{error}</p>
          <Button variant="outline" size="sm" onClick={reload}>Retry</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Average Length of Stay
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total time patients spend in the emergency ward (admission → discharge)
          </p>
        </div>
        {role === 'admin' && !readOnly && (
          <LosTargetConfig currentTargetMinutes={targetMinutes} onSaved={handleTargetSaved} />
        )}
      </div>

      {!readOnly && (
        <LosFilterBar filters={filters} onChange={setFilters} readOnly={readOnly} />
      )}

      {summary ? (
        <LosKpiCards summary={summary} />
      ) : (
        <div className="rounded-lg border border-border bg-card py-12 text-center text-sm text-muted-foreground">
          No discharge records found for the selected period.
        </div>
      )}

      <LosTrendChart trend={trend ?? []} targetLosMs={summary?.targetLosMs ?? null} />
    </div>
  )
}
