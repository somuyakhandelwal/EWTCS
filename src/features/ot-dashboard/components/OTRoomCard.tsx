'use client'

// OT Room Card Component
// EPIC 23: Operation Theatre (OT) Tracking Module (US-23.1)

import { useState } from 'react'
import { cn } from '@/shared/lib/utils'
import type { OTRoom } from '../types/ot'
import { updateOTRoomStatus } from '../actions/ot-actions'

interface OTRoomCardProps {
  room: OTRoom
  onStatusChange?: () => void
}

function formatElapsed(startedAt: Date | null): string {
  if (!startedAt) return ''
  const ms = Date.now() - new Date(startedAt).getTime()
  const mins = Math.floor(ms / 60000)
  const hrs = Math.floor(mins / 60)
  if (hrs > 0) return `${hrs}h ${mins % 60}m`
  return `${mins}m`
}

export function OTRoomCard({ room, onStatusChange }: OTRoomCardProps) {
  const [loading, setLoading] = useState(false)

  const isOngoing = room.status === 'ongoing'

  async function handleToggle() {
    setLoading(true)
    const newStatus = isOngoing ? 'available' : 'ongoing'
    await updateOTRoomStatus({ roomId: room.id, status: newStatus })
    setLoading(false)
    onStatusChange?.()
  }

  return (
    <div
      className={cn(
        'rounded-xl border-2 p-4 flex flex-col gap-3 transition-all duration-200',
        isOngoing
          ? 'border-red-500 bg-red-500/10'
          : 'border-emerald-500 bg-emerald-500/10'
      )}
    >
      {/* Room Number */}
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-foreground">{room.roomNumber}</span>
        <span
          className={cn(
            'text-xs font-semibold px-2 py-0.5 rounded-full',
            isOngoing
              ? 'bg-red-500 text-white'
              : 'bg-emerald-500 text-white'
          )}
        >
          {isOngoing ? 'Ongoing' : 'Available'}
        </span>
      </div>

      {/* Elapsed time for ongoing */}
      {isOngoing && room.startedAt && (
        <p className="text-xs text-red-400 font-mono">
          Duration: {formatElapsed(room.startedAt)}
        </p>
      )}

      {/* Toggle Button */}
      <button
        onClick={handleToggle}
        disabled={loading}
        className={cn(
          'w-full rounded-lg py-1.5 text-xs font-semibold transition-colors disabled:opacity-50',
          isOngoing
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
            : 'bg-red-600 hover:bg-red-700 text-white'
        )}
      >
        {loading ? 'Updating...' : isOngoing ? 'Mark Available' : 'Mark Ongoing'}
      </button>
    </div>
  )
}