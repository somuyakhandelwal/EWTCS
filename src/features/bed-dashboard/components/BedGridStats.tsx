// Bed Grid Statistics Bar Component
// Epic 1: Nurse Desk Bed Dashboard

import { memo } from 'react'
import { formatElapsedTime } from '../lib/utils'

interface BedGridStatsProps {
  total: number
  occupied: number
  available: number
  delayed: number
  bottleneckCount: number
  escalationCount: number
  cleaningCount?: number
  avgTatMs?: number | null
}

export const BedGridStats = memo(function BedGridStats({
  total,
  occupied,
  available,
  delayed,
  bottleneckCount,
  escalationCount,
  cleaningCount = 0,
  avgTatMs = null,
}: BedGridStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 p-4 bg-muted/20 rounded-lg border border-border">
      <div>
        <p className="text-xs text-muted-foreground uppercase">Total Beds</p>
        <p className="text-xl sm:text-2xl font-bold text-foreground">{total}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase">Occupied</p>
        <p className="text-xl sm:text-2xl font-bold text-status-occupied">{occupied}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase">Available</p>
        <p className="text-xl sm:text-2xl font-bold text-status-empty">{available}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase">Delayed</p>
        <p className="text-xl sm:text-2xl font-bold text-status-delayed">{delayed}</p>
      </div>
      {/* US-15.3: Critical Escalation count */}
      <div>
        <p className="text-xs text-muted-foreground uppercase">Escalated</p>
        <p className={`text-xl sm:text-2xl font-bold ${escalationCount > 0 ? 'text-status-escalated' : 'text-muted-foreground'}`}>
          {escalationCount}
        </p>
      </div>
      {/* US-1.6: Disposition bottleneck count — spans both columns on mobile to avoid orphan */}
      <div className="col-span-2 sm:col-span-1">
        <p className="text-xs text-muted-foreground uppercase">Disposition Hold</p>
        <p className={`text-xl sm:text-2xl font-bold ${bottleneckCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
          {bottleneckCount}
        </p>
      </div>
      {/* US-2.4: Cleaning count */}
      <div>
        <p className="text-xs text-muted-foreground uppercase">Cleaning</p>
        <p className={`text-2xl font-bold ${cleaningCount > 0 ? 'text-status-cleaning' : 'text-muted-foreground'}`}>
          {cleaningCount}
        </p>
      </div>
      {/* US-2.4: Average cleaning TAT */}
      {avgTatMs !== null && avgTatMs > 0 && (
        <div className="col-span-2 sm:col-span-1">
          <p className="text-xs text-muted-foreground uppercase">Avg Cleaning TAT (24h)</p>
          <p className="text-2xl font-bold text-foreground">
            {formatElapsedTime(avgTatMs)}
          </p>
        </div>
      )}
    </div>
  )
})
