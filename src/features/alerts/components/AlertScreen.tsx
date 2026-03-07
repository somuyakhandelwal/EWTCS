// Alert Screen — Full client component for the supervisor alert screen
// EPIC 15: Notifications & Alerts (US-15.4)
// US-15.4: Supervisor dedicated alert screen with real-time updates,
//   severity sorting, and per-alert acknowledgment.

'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Bell, BellOff, RefreshCw, Settings } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { ConnectionStatus } from '@/features/bed-dashboard/components/ConnectionStatus'
import { AlertCard } from './AlertCard'
import { AlertFilters } from './AlertFilters'
import { useRealtimeAlerts } from '../hooks/useRealtimeAlerts'
import { ALERT_SEVERITY_ORDER } from '../types/alert'
import type { Alert, AlertScreenFilters, AlertSortField, AlertSortDirection } from '../types/alert'

interface AlertScreenProps {
  initialAlerts: Alert[]
}

const DEFAULT_FILTERS: AlertScreenFilters = {
  sortBy:           'severity',
  sortDir:          'asc',
  showAcknowledged: true,
}

function sortAlerts(
  alerts: Alert[],
  sortBy: AlertSortField,
  sortDir: AlertSortDirection
): Alert[] {
  const dir = sortDir === 'asc' ? 1 : -1

  return [...alerts].sort((a, b) => {
    if (sortBy === 'severity') {
      const diff = ALERT_SEVERITY_ORDER[a.severity] - ALERT_SEVERITY_ORDER[b.severity]
      return diff !== 0 ? diff * dir : (b.elapsedTimeMs - a.elapsedTimeMs)
    }
    if (sortBy === 'elapsed') {
      return (b.elapsedTimeMs - a.elapsedTimeMs) * dir
    }
    // sortBy === 'type'
    return a.type.localeCompare(b.type) * dir
  })
}

export function AlertScreen({ initialAlerts }: AlertScreenProps) {
  const [filters, setFilters] = useState<AlertScreenFilters>(DEFAULT_FILTERS)

  const { alerts, connectionStatus, isLoading, refresh, reconnect } =
    useRealtimeAlerts(initialAlerts)

  const criticalCount     = useMemo(() => alerts.filter((a) => a.severity === 'critical').length, [alerts])
  const warningCount      = useMemo(() => alerts.filter((a) => a.severity === 'warning').length, [alerts])
  const acknowledgedCount = useMemo(() => alerts.filter((a) => a.isAcknowledged).length, [alerts])

  const visibleAlerts = useMemo(() => {
    const filtered = filters.showAcknowledged
      ? alerts
      : alerts.filter((a) => !a.isAcknowledged)
    return sortAlerts(filtered, filters.sortBy, filters.sortDir)
  }, [alerts, filters])

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AlertFilters
          filters={filters}
          onChange={setFilters}
          totalCount={alerts.length}
          criticalCount={criticalCount}
          warningCount={warningCount}
          acknowledgedCount={acknowledgedCount}
        />
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <ConnectionStatus status={connectionStatus} onReconnect={reconnect} />
          <Link
            href="/supervisor/alerts/preferences"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 transition-colors"
            aria-label="Configure notification preferences"
          >
            <Settings className="h-3.5 w-3.5" />
            Preferences
          </Link>
          <Button
            size="sm"
            variant="ghost"
            onClick={refresh}
            disabled={isLoading}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alert list */}
      {visibleAlerts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onAcknowledged={refresh}
            />
          ))}
        </div>
      ) : (
        <EmptyState hasAlerts={alerts.length > 0} showingAcknowledged={filters.showAcknowledged} />
      )}
    </div>
  )
}

function EmptyState({
  hasAlerts,
  showingAcknowledged,
}: {
  hasAlerts: boolean
  showingAcknowledged: boolean
}) {
  if (hasAlerts && !showingAcknowledged) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 py-12 text-center">
        <BellOff className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-400 text-sm">All alerts acknowledged.</p>
        <p className="text-zinc-600 text-xs mt-1">Enable &ldquo;Show acknowledged&rdquo; to view them.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 py-12 text-center">
      <Bell className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
      <p className="text-zinc-400 text-sm font-medium">No active alerts</p>
      <p className="text-zinc-600 text-xs mt-1">
        All beds are on track. The screen updates every 3 seconds.
      </p>
    </div>
  )
}
