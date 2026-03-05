'use client'

// US-13.5: System health + error monitoring panel for the admin dashboard.
// Shows live DB health, pool utilisation, error trend counts, and a filterable
// error event table with per-row acknowledge action.

import { useState, useEffect, useCallback } from 'react'
import { Activity, AlertTriangle, CheckCircle, RefreshCw, XCircle } from 'lucide-react'

interface PoolStats { total: number; idle: number; waiting: number; max: number; utilization: string }
interface HealthData { status: string; timestamp: string; database: { reachable: boolean; pool: PoolStats } }

interface ErrorEvent {
  id: string; level: string; category: string; message: string
  acknowledged: boolean; created_at: string
}
interface Summary {
  last24h: { total: number; critical: number; error: number; warn: number }
  last7d:  { total: number; critical: number; error: number; warn: number }
  unacknowledged: number
}

const LEVEL_STYLE: Record<string, string> = {
  CRITICAL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  ERROR:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  WARN:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
}

function Badge({ level }: { level: string }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${LEVEL_STYLE[level] ?? ''}`}>
      {level}
    </span>
  )
}

export function SystemHealthPanel() {
  const [health,   setHealth]   = useState<HealthData | null>(null)
  const [summary,  setSummary]  = useState<Summary | null>(null)
  const [events,   setEvents]   = useState<ErrorEvent[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState<string>('ALL')
  const [showAll,  setShowAll]  = useState(false)

  const refresh = useCallback(async () => {
    try {
      const [hRes, eRes] = await Promise.all([
        fetch('/api/health', { cache: 'no-store' }),
        fetch('/api/monitoring/errors?limit=100', { cache: 'no-store' }),
      ])
      if (hRes.ok) setHealth(await hRes.json())
      if (eRes.ok) { const d = await eRes.json(); setSummary(d.summary); setEvents(d.recent) }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])
  // Auto-refresh every 30 s
  useEffect(() => { const t = setInterval(refresh, 30_000); return () => clearInterval(t) }, [refresh])

  const acknowledge = async (id: string) => {
    await fetch('/api/monitoring/errors', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setEvents(ev => ev.map(e => e.id === id ? { ...e, acknowledged: true } : e))
  }

  const visible = events
    .filter(e => filter === 'ALL' || e.level === filter)
    .slice(0, showAll ? 100 : 10)

  const healthy = health?.database.reachable !== false
  const pool    = health?.database.pool

  return (
    <div className="space-y-4">
      {/* Health summary row */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
          {healthy
            ? <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
            : <XCircle    className="h-5 w-5 shrink-0 text-destructive" />}
          <div>
            <p className="text-xs text-muted-foreground">Database</p>
            <p className={`text-sm font-medium ${healthy ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
              {loading ? '…' : healthy ? 'Connected' : 'Unreachable'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
          <Activity className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Pool utilisation</p>
            <p className="text-sm font-medium text-foreground">{pool?.utilization ?? '—'}</p>
            {pool && (
              <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all"
                  style={{ width: pool.utilization }} />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
          <AlertTriangle className={`h-5 w-5 shrink-0 ${(summary?.unacknowledged ?? 0) > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          <div>
            <p className="text-xs text-muted-foreground">Unacknowledged</p>
            <p className="text-sm font-medium text-foreground">{summary?.unacknowledged ?? '—'} errors</p>
          </div>
        </div>
      </div>

      {/* Trend counts */}
      {summary && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-center">
          {[
            { label: 'CRITICAL 24h', value: summary.last24h.critical, cls: 'text-purple-600 dark:text-purple-400' },
            { label: 'ERROR 24h',    value: summary.last24h.error,    cls: 'text-destructive' },
            { label: 'WARN 24h',     value: summary.last24h.warn,     cls: 'text-yellow-600 dark:text-yellow-400' },
            { label: 'Total 7d',     value: summary.last7d.total,     cls: 'text-foreground' },
          ].map(({ label, value, cls }) => (
            <div key={label} className="rounded-lg border bg-card p-3">
              <p className={`text-2xl font-bold ${cls}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter + refresh row */}
      <div className="flex flex-wrap items-center gap-2">
        {['ALL','CRITICAL','ERROR','WARN'].map(l => (
          <button key={l} onClick={() => setFilter(l)}
            className={`rounded-md px-3 py-1 text-xs font-medium border transition-colors
              ${filter === l ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            {l}
          </button>
        ))}
        <button onClick={refresh} className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {/* Events table */}
      {visible.length > 0 ? (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Level</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Message</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Time</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Ack</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((e, i) => (
                <tr key={e.id} className={`${i % 2 === 0 ? '' : 'bg-muted/10'} ${e.acknowledged ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-2"><Badge level={e.level} /></td>
                  <td className="px-3 py-2 text-xs text-muted-foreground capitalize">{e.category}</td>
                  <td className="px-3 py-2 text-xs text-foreground max-w-xs truncate" title={e.message}>{e.message}</td>
                  <td className="px-3 py-2 text-right text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {!e.acknowledged && (
                      <button onClick={() => acknowledge(e.id)}
                        className="rounded px-2 py-0.5 text-xs text-muted-foreground border hover:text-foreground transition-colors">
                        Done
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {events.filter(e => filter === 'ALL' || e.level === filter).length > 10 && (
            <div className="border-t px-3 py-2 text-center">
              <button onClick={() => setShowAll(v => !v)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {showAll ? 'Show less' : `Show all ${events.length} events`}
              </button>
            </div>
          )}
        </div>
      ) : (
        !loading && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {filter === 'ALL' ? 'No error events recorded yet.' : `No ${filter} events.`}
          </p>
        )
      )}
    </div>
  )
}
