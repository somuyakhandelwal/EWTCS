// LosView — Average Length of Stay analytics view
// EPIC 10: Management Report Dashboard
// US-10.x: Average Time Patients Spend in Emergency Ward
//
// Assembles: LosFilterBar + LosKpiCards + LosTrendChart + optional target config (admin only)

'use client'

import { useState, useCallback, useEffect } from 'react'
import { AlertCircle, Settings, Check, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { logger } from '@/shared/config/logger'
import { useLosData } from '../hooks/useLosData'
import { LosFilterBar } from './LosFilterBar'
import { LosKpiCards } from './LosKpiCards'
import { LosTrendChart } from './LosTrendChart'
import { saveLosTarget, fetchLosTarget } from '../actions/los-actions'
import type { LosFilters } from '../lib/los-queries'

// ── Default filters: last 30 days ─────────────────────────────────────────────

function defaultFilters(): LosFilters {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return { startDate: start, endDate: end }
}

// ── Target configuration sub-component (admin only) ───────────────────────────

interface TargetConfigProps {
  currentTargetMinutes: number | null
  onSaved: () => void
}

function TargetConfig({ currentTargetMinutes, onSaved }: TargetConfigProps) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<string>(
    currentTargetMinutes !== null ? String(currentTargetMinutes) : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const minutes = value.trim() === '' ? null : Number(value)
      if (minutes !== null && (isNaN(minutes) || minutes <= 0)) {
        setError('Please enter a positive number of minutes.')
        return
      }
      const result = await saveLosTarget(minutes)
      if (!result.success) throw new Error(result.error)
      setOpen(false)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
      logger.error('Failed to save LoS target', err as Error)
    } finally {
      setSaving(false)
    }
  }, [value, onSaved])

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-zinc-500 hover:text-zinc-200 h-7 px-2"
        title="Configure LoS target"
      >
        <Settings className="h-3.5 w-3.5 mr-1" />
        <span className="text-[10px]">
          {currentTargetMinutes !== null
            ? `Target: ${currentTargetMinutes}m`
            : 'Set Target'}
        </span>
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5">
      <label className="text-[10px] text-zinc-400 whitespace-nowrap">Target (min):</label>
      <input
        type="number"
        min="1"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. 240"
        className={cn(
          'w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 text-xs text-zinc-200',
          'focus:outline-none focus:ring-1 focus:ring-blue-500',
        )}
      />
      {error && <span className="text-[10px] text-red-400">{error}</span>}
      <Button
        size="sm"
        onClick={handleSave}
        disabled={saving}
        className="h-6 px-2 text-[10px]"
      >
        <Check className="h-3 w-3 mr-1" />
        {saving ? 'Saving…' : 'Save'}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => { setOpen(false); setError(null) }}
        className="h-6 px-1.5 text-zinc-500 hover:text-zinc-200"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface LosViewProps {
  /** When true, hides filter controls and target config (auditor / read-only mode) */
  readOnly?: boolean
  /** User role — needed to conditionally show admin target config */
  role?: string
  className?: string
}

export function LosView({ readOnly = false, role, className }: LosViewProps) {
  const [filters, setFilters] = useState<LosFilters>(defaultFilters)
  const [targetMinutes, setTargetMinutes] = useState<number | null>(null)

  const { summary, trend, loading, error, reload } = useLosData(filters)

  // Load the current target for the TargetConfig UI (admin only)
  const loadTarget = useCallback(async () => {
    if (role !== 'admin') return
    try {
      const result = await fetchLosTarget()
      if (result.success) {
        setTargetMinutes(result.targetMinutes ?? null)
      }
    } catch (err) {
      logger.error('Failed to load LoS target for config', err as Error)
    }
  }, [role])

  useEffect(() => { void loadTarget() }, [loadTarget])

  const handleTargetSaved = useCallback(() => {
    void loadTarget()
    reload()
  }, [loadTarget, reload])

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="h-8 w-72 rounded bg-zinc-800 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-zinc-800 animate-pulse" />
          ))}
        </div>
        <div className="h-56 rounded-lg bg-zinc-800 animate-pulse" />
      </div>
    )
  }

  // ── Error state ───────────────────────────────────────────────────────────

  if (error) {
    return (
      <Card className={cn('bg-zinc-900 border-red-900', className)}>
        <CardHeader>
          <CardTitle className="text-red-400 flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4" />
            Error Loading Length of Stay Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-red-300">{error}</p>
          <Button variant="outline" size="sm" onClick={reload}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className={cn('space-y-4', className)}>
      {/* Section header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Average Length of Stay
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Total time patients spend in the emergency ward (admission → discharge)
          </p>
        </div>

        {/* Admin: target configuration */}
        {role === 'admin' && !readOnly && (
          <TargetConfig
            currentTargetMinutes={targetMinutes}
            onSaved={handleTargetSaved}
          />
        )}
      </div>

      {/* Filters */}
      {!readOnly && (
        <LosFilterBar
          filters={filters}
          onChange={setFilters}
          readOnly={readOnly}
        />
      )}

      {/* KPI cards */}
      {summary ? (
        <LosKpiCards summary={summary} />
      ) : (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 py-12 text-center text-sm text-zinc-500">
          No discharge records found for the selected period.
        </div>
      )}

      {/* Trend chart */}
      <LosTrendChart
        trend={trend ?? []}
        targetLosMs={summary?.targetLosMs ?? null}
      />
    </div>
  )
}
