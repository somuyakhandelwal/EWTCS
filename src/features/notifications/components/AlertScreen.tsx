'use client'
// US-15.4: Supervisor Alert Screen — unified sortable/filterable alert feed, auto-polls every 30s.

import { useState, useCallback, useEffect } from 'react'
import { RefreshCw, CheckCheck, ArrowUpDown, Filter, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  getAlertScreenData,
  acknowledgeSystemAlert,
} from '@/features/notifications/actions/alert-screen-actions'
import type { AlertItem, AlertItemKind } from '@/features/notifications/types/alert-item'
import { SEVERITY_RANK } from '@/features/notifications/types/alert-item'
import type { AlertScreenData } from '@/features/notifications/actions/alert-screen-actions'
import { KIND_LABELS } from './alert-screen-config'
import { AlertRow } from './AlertRow'

const POLL_INTERVAL_MS = 30_000
type SortKey = 'severity' | 'time'
type FilterKind = 'all' | AlertItemKind

interface AlertScreenProps {
  initialData: AlertScreenData | null
}

export function AlertScreen({ initialData }: AlertScreenProps) {
  const [data, setData] = useState<AlertScreenData | null>(initialData)
  const [loading, setLoading] = useState(false)
  const [connected, setConnected] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('severity')
  const [filterKind, setFilterKind] = useState<FilterKind>('all')
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set())
  const [ackLoadingId, setAckLoadingId] = useState<string | null>(null)

  // ─── Fetch / poll ───────────────────────────────────────────────────────
  const refresh = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true)
    try {
      const result = await getAlertScreenData()
      if (result.success && result.data) {
        setData(result.data)
        setConnected(true)
      } else {
        setConnected(false)
      }
    } catch {
      setConnected(false)
    } finally {
      if (showSpinner) setLoading(false)
    }
  }, [])

  // Initial load if no server-side data
  useEffect(() => {
    if (!initialData) void refresh(true)
  }, [initialData, refresh])

  // Auto-poll
  useEffect(() => {
    const t = setInterval(() => void refresh(false), POLL_INTERVAL_MS)
    return () => clearInterval(t)
  }, [refresh])

  // ─── Acknowledge ─────────────────────────────────────────────────────────
  const handleAcknowledge = useCallback(async (alert: AlertItem) => {
    setAckLoadingId(alert.id)
    try {
      if (alert.kind === 'system_error') {
        await acknowledgeSystemAlert(alert.errorEventId)
      }
      // For bed alerts — acknowledged client-side only (no persistent state needed,
      // the alert disappears on next poll when bed is no longer delayed)
      setAcknowledgedIds(prev => new Set(prev).add(alert.id))
    } finally {
      setAckLoadingId(null)
    }
  }, [])

  // ─── Derived list ─────────────────────────────────────────────────────────
  const alerts: AlertItem[] = (data?.alerts ?? []).map(a =>
    acknowledgedIds.has(a.id) ? { ...a, acknowledged: true } : a
  )

  const filtered = alerts.filter(a => filterKind === 'all' || a.kind === filterKind)

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'severity') {
      const diff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
      if (diff !== 0) return diff
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    }
    // sort by time (newest first)
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })

  const unackedCount = alerts.filter(a => !a.acknowledged).length
  const kindOptions: FilterKind[] = ['all', 'delayed_bed', 'escalation', 'bottleneck', 'system_error']

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">Active Alerts</h2>
          {unackedCount > 0 && (
            <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">
              {unackedCount}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {connected
              ? <Wifi className="h-3.5 w-3.5 text-green-500" />
              : <WifiOff className="h-3.5 w-3.5 text-destructive" />}
            {connected ? 'Live' : 'Reconnecting…'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sort toggle */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSortKey(k => (k === 'severity' ? 'time' : 'severity'))}
            className="gap-1.5"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            Sort: {sortKey === 'severity' ? 'Severity' : 'Time'}
          </Button>

          {/* Kind filter */}
          <div className="flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={filterKind}
              onChange={e => setFilterKind(e.target.value as FilterKind)}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {kindOptions.map(k => (
                <option key={k} value={k}>
                  {k === 'all' ? 'All types' : KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </div>

          {/* Manual refresh */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void refresh(true)}
            disabled={loading}
            title="Refresh alerts"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Last fetched */}
      {data?.fetchedAt && (
        <p className="text-xs text-muted-foreground">
          Last updated: {new Date(data.fetchedAt).toLocaleTimeString()} · auto-refreshes every 30s
        </p>
      )}

      {/* Alert list */}
      {loading && !data && (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground text-sm">
          Loading alerts…
        </div>
      )}

      {!loading && sorted.length === 0 && (
        <div className="rounded-lg border border-border bg-card py-12 text-center">
          <CheckCheck className="h-10 w-10 text-green-500 mx-auto mb-3" />
          <p className="font-semibold text-foreground">All clear</p>
          <p className="text-sm text-muted-foreground mt-1">
            {filterKind === 'all'
              ? 'No active alerts — all patients on track and no system errors.'
              : `No active ${KIND_LABELS[filterKind as AlertItemKind] ?? ''} alerts.`}
          </p>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="space-y-2">
          {sorted.map(alert => (
            <AlertRow
              key={alert.id}
              alert={alert}
              onAcknowledge={handleAcknowledge}
              ackLoading={ackLoadingId === alert.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
