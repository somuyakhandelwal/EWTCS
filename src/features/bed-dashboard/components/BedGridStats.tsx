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
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
      <div>
        <p className="text-xs text-zinc-500 uppercase">Total Beds</p>
        <p className="text-xl sm:text-2xl font-bold text-white">{total}</p>
      </div>
      <div>
        <p className="text-xs text-zinc-500 uppercase">Occupied</p>
        <p className="text-xl sm:text-2xl font-bold text-green-400">{occupied}</p>
      </div>
      <div>
        <p className="text-xs text-zinc-500 uppercase">Available</p>
        <p className="text-xl sm:text-2xl font-bold text-blue-400">{available}</p>
      </div>
      <div>
        <p className="text-xs text-zinc-500 uppercase">Delayed</p>
        <p className="text-xl sm:text-2xl font-bold text-red-400">{delayed}</p>
      </div>
      <div>
        <p className="text-xs text-zinc-500 uppercase">Escalated</p>
        <p className={`text-xl sm:text-2xl font-bold ${escalationCount > 0 ? 'text-fuchsia-400' : 'text-zinc-500'}`}>
          {escalationCount}
        </p>
      </div>
      {/* US-1.6: Disposition bottleneck count — spans both columns on mobile to avoid orphan */}
      <div className="col-span-2 sm:col-span-1">
        <p className="text-xs text-zinc-500 uppercase">Disposition Hold</p>
        <p className={`text-xl sm:text-2xl font-bold ${bottleneckCount > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
          {bottleneckCount}
        </p>
      </div>
      {/* US-2.4: Cleaning count */}
      <div>
        <p className="text-xs text-zinc-500 uppercase">Cleaning</p>
        <p className={`text-2xl font-bold ${cleaningCount > 0 ? 'text-pink-400' : 'text-zinc-500'}`}>
          {cleaningCount}
        </p>
      </div>
      {/* US-2.4: Average turnaround time */}
      {avgTatMs !== null && avgTatMs > 0 && (
        <div>
          <p className="text-xs text-zinc-500 uppercase">Avg TAT (24h)</p>
          <p className="text-2xl font-bold text-amber-400">
            {formatElapsedTime(avgTatMs)}
          </p>
        </div>
      )}
    </div>
  )
})
