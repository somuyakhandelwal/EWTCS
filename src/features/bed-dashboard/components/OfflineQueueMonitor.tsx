'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Clock3, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'

type MonitorEntry = {
  id: string
  user_id: string
  username: string
  operation_type: string
  payload: Record<string, unknown> | null
  enqueued_at: string
  failed_at: string | null
  error_message: string | null
  bed_id: string | null
  bed_number: string | null
  ward_id: string | null
  ward_name: string | null
  status: 'pending' | 'failed'
}

const POLL_MS = 30_000

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function OfflineQueueMonitor() {
  const [entries, setEntries] = useState<MonitorEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true)
    try {
      const response = await fetch('/api/offline-queue?mode=monitor&limit=200', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Failed to fetch offline queue monitor data')
      }

      const data = await response.json()
      setEntries(Array.isArray(data.entries) ? data.entries : [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch queue monitor')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void fetchEntries()
    const timer = window.setInterval(() => {
      void fetchEntries()
    }, POLL_MS)
    return () => window.clearInterval(timer)
  }, [fetchEntries])

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base text-foreground">Offline Queue Monitor</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Pending and failed offline operations for your access scope
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void fetchEntries(true)}
          disabled={isRefreshing}
          className="h-8"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading queue monitor...</p>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending or failed offline queue entries.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Queued By</th>
                  <th className="py-2 pr-3">Bed</th>
                  <th className="py-2 pr-3">Operation</th>
                  <th className="py-2 pr-3">Enqueued</th>
                  <th className="py-2 pr-3">Error</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border/60">
                    <td className="py-2 pr-3">
                      {entry.status === 'failed' ? (
                        <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs bg-red-900/30 text-red-300 border border-red-800/60">
                          <AlertCircle className="h-3 w-3" />
                          Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs bg-amber-900/30 text-amber-300 border border-amber-700/60">
                          <Clock3 className="h-3 w-3" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-foreground">{entry.username}</td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {entry.bed_number ?? 'Unknown'}
                      {entry.ward_name ? ` (${entry.ward_name})` : ''}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">{entry.operation_type}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{formatTime(entry.enqueued_at)}</td>
                    <td className="py-2 pr-3 text-red-300">
                      {entry.status === 'failed'
                        ? entry.error_message ?? `Failed at ${formatTime(entry.failed_at)}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
