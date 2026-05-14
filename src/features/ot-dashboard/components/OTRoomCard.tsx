'use client'

// OT Room Card Component
// EPIC 23: Operation Theatre (OT) Tracking Module (US-23.1)

import { useState, useTransition } from 'react'
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
  const [optimisticStatus, setOptimisticStatus] = useState(room.status)
  const [optimisticStartedAt, setOptimisticStartedAt] = useState(room.startedAt)
  const [procedureName, setProcedureName] = useState(room.activeProcedureName || '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isOngoing = optimisticStatus === 'ongoing'

  async function handleToggle() {
    setError(null)

    const newStatus = isOngoing ? 'available' : 'ongoing'
    const trimmedProcedureName = procedureName.trim()

    if (newStatus === 'ongoing' && trimmedProcedureName.length < 2) {
      setError('Procedure name is required before starting')
      return
    }

    // Optimistic update — UI changes immediately
    setOptimisticStatus(newStatus)
    setOptimisticStartedAt(newStatus === 'ongoing' ? new Date() : null)

    const result = await updateOTRoomStatus({
      roomId: room.id,
      status: newStatus,
      procedureName: newStatus === 'ongoing' ? trimmedProcedureName : undefined,
    })

    if (!result.success) {
      // Revert on error
      setOptimisticStatus(room.status)
      setOptimisticStartedAt(room.startedAt)
      setError(result.error || 'Failed to update OT room')
      return
    } else {
      if (newStatus === 'available') {
        setProcedureName('')
      }
      startTransition(() => {
        onStatusChange?.()
      })
    }
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

      {isOngoing && optimisticStartedAt && (
        <div className="space-y-1">
          <p className="text-xs text-red-400 font-mono">
            Duration: {formatElapsed(optimisticStartedAt)}
          </p>
          <p className="text-xs text-foreground/80 truncate" title={procedureName || room.activeProcedureName || ''}>
            Procedure: {procedureName || room.activeProcedureName || 'Unknown'}
          </p>
        </div>
      )}

      {!isOngoing && (
        <div className="space-y-1">
          <label htmlFor={`procedure-${room.id}`} className="text-xs text-muted-foreground">
            Procedure Name
          </label>
          <input
            id={`procedure-${room.id}`}
            value={procedureName}
            onChange={(e) => setProcedureName(e.target.value)}
            placeholder="e.g., Appendectomy"
            disabled={isPending}
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
            maxLength={100}
          />
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <button
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          'w-full rounded-lg py-1.5 text-xs font-semibold transition-colors disabled:opacity-50',
          isOngoing
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
            : 'bg-red-600 hover:bg-red-700 text-white'
        )}
      >
        {isPending ? 'Updating...' : isOngoing ? 'Mark Available' : 'Mark Ongoing'}
      </button>
    </div>
  )
}