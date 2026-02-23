// StorageStatsView — live PostgreSQL storage monitoring panel
// EPIC 14 — US-14.4: Storage Optimization
//
// Shows per-table sizes as proportional bars plus a total-DB figure.
// An amber alert banner appears when total DB size exceeds the configured
// threshold (system_settings.storage_alert_threshold_gb).

'use client'

import { useState, useTransition, useEffect } from 'react'
import { HardDrive, AlertTriangle, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { fetchStorageStatsAction } from '../actions/storage-actions'
import type { StorageStats, TableSizeInfo } from '../lib/data-retention-types'

// ── Helpers ────────────────────────────────────────────────────────────────

function barWidthPct(tableBytes: number, maxBytes: number): number {
  if (maxBytes === 0) return 0
  return Math.max(2, Math.round((tableBytes / maxBytes) * 100))
}

function barColor(pct: number): string {
  if (pct >= 80) return 'bg-red-500'
  if (pct >= 50) return 'bg-yellow-500'
  return 'bg-blue-500'
}

// ── Sub-component: single row bar ─────────────────────────────────────────

interface TableBarProps {
  info: TableSizeInfo
  maxBytes: number
}

function TableBar({ info, maxBytes }: TableBarProps) {
  const pct = barWidthPct(info.totalBytes, maxBytes)
  return (
    <div className="grid grid-cols-[160px_1fr_64px] items-center gap-3">
      <span className="text-xs text-zinc-400 truncate font-mono">{info.tableName}</span>
      <div className="h-2 rounded bg-zinc-800 overflow-hidden">
        <div
          className={cn('h-full rounded transition-all duration-500', barColor(pct))}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-zinc-500 text-right">{info.prettySize}</span>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

interface StorageStatsViewProps {
  initialStats?: StorageStats
  className?: string
}

export function StorageStatsView({ initialStats, className }: StorageStatsViewProps) {
  const [stats, setStats] = useState<StorageStats | null>(initialStats ?? null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Auto-load on mount if no initial data provided
  useEffect(() => {
    if (!initialStats) {
      handleRefresh()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleRefresh() {
    setError(null)
    startTransition(async () => {
      const result = await fetchStorageStatsAction()
      if (!result.success || !result.data) {
        setError(result.error ?? 'Failed to load storage stats')
        return
      }
      setStats(result.data)
    })
  }

  const maxBytes = stats
    ? Math.max(...stats.tables.map((t) => t.totalBytes), 1)
    : 1

  const sampledLabel = stats
    ? new Date(stats.sampledAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <Card className={cn('bg-zinc-900 border-zinc-800', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-zinc-400" />
              Storage Usage
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Live PostgreSQL table sizes (includes indexes &amp; TOAST).
              {sampledLabel && (
                <span className="ml-1 text-zinc-600">Sampled at {sampledLabel}.</span>
              )}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isPending}
            className="text-zinc-500 hover:text-zinc-200 h-7 px-2"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isPending && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* ── Alert banner ── */}
        {stats?.isAlertTriggered && (
          <div className="flex items-start gap-2 rounded-md border border-yellow-700/60 bg-yellow-900/20 px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-300">
              Total database size ({stats.prettyTotal}) has exceeded the{' '}
              <span className="font-semibold">{stats.alertThresholdGb} GB</span> alert threshold.
              Consider triggering an archival run to free space.
            </p>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        {/* ── Loading placeholder ── */}
        {isPending && !stats && (
          <p className="text-xs text-zinc-500 py-4 text-center">Loading storage stats…</p>
        )}

        {/* ── Table bars ── */}
        {stats && stats.tables.length === 0 && (
          <p className="text-xs text-zinc-500 py-4 text-center">
            No monitored tables found.
          </p>
        )}
        {stats && stats.tables.length > 0 && (
          <div className="space-y-2.5">
            {stats.tables.map((t) => (
              <TableBar key={t.tableName} info={t} maxBytes={maxBytes} />
            ))}
          </div>
        )}

        {/* ── Total DB size ── */}
        {stats && (
          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
            <span className="text-[10px] text-zinc-500">Total database size</span>
            <span className={cn(
              'text-xs font-semibold',
              stats.isAlertTriggered ? 'text-yellow-400' : 'text-zinc-300',
            )}>
              {stats.prettyTotal}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
