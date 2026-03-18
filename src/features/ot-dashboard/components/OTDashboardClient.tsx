'use client'

// OT Dashboard Client Component
// EPIC 23: Operation Theatre (OT) Tracking Module (US-23.1)

import { useState, useEffect, useCallback } from 'react'
import { Activity, CheckCircle } from 'lucide-react'
import { OTRoomCard } from './OTRoomCard'
import { getOTRooms } from '../actions/ot-actions'
import type { OTGridData } from '../types/ot'

const POLL_INTERVAL_MS = 15000

interface OTDashboardClientProps {
  initialData: OTGridData
}

export function OTDashboardClient({ initialData }: OTDashboardClientProps) {
  const [data, setData] = useState<OTGridData>(initialData)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const refresh = useCallback(async () => {
    const result = await getOTRooms()
    if (result.success && result.data) {
      setData(result.data)
      setLastUpdated(new Date())
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(refresh, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [refresh])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Rooms</p>
          <p className="text-2xl font-bold text-foreground">{data.rooms.length}</p>
        </div>
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <p className="text-xs text-emerald-600 dark:text-emerald-400">Available</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {data.availableCount}
          </p>
        </div>
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-red-500" />
            <p className="text-xs text-red-600 dark:text-red-400">Ongoing</p>
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {data.ongoingCount}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {data.rooms.map(room => (
          <OTRoomCard
            key={room.id}
            room={room}
            onStatusChange={refresh}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-right">
        {lastUpdated
          ? `Last updated: ${lastUpdated.toLocaleTimeString()} · Auto-refreshes every 15s`
          : 'Auto-refreshes every 15s'}
      </p>
    </div>
  )
}