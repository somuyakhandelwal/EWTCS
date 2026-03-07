// Shifts Table Component — Admin
// EPIC 8: Shift Management (US-8.1)
// Purpose: Display all shifts with edit/delete controls.

'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { deleteShiftAction } from '../actions/shift-actions'
import type { Shift } from '../types/shift'

interface ShiftsTableProps {
  shifts: Shift[]
  onEdit: (shift: Shift) => void
  onCreated: () => void
  onDeleted: () => void
}

function formatTime(t: string): string {
  // Convert "HH:MM:SS" → "HH:MM"
  return t.slice(0, 5)
}

function shiftSpan(shift: Shift): string {
  const s = formatTime(shift.startTime)
  const e = formatTime(shift.endTime)
  const overnight = shift.endTime <= shift.startTime
  return `${s} – ${e}${overnight ? ' (+1)' : ''}`
}

export function ShiftsTable({ shifts, onEdit, onCreated, onDeleted }: ShiftsTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete(shift: Shift) {
    if (!confirm(`Delete shift "${shift.name}"? This cannot be undone.`)) return
    setDeletingId(shift.id)
    setError(null)

    startTransition(async () => {
      const result = await deleteShiftAction({ id: shift.id })
      setDeletingId(null)
      if (!result.success) {
        setError(result.error ?? 'Failed to delete shift')
      } else {
        onDeleted()
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Shift Schedules</h2>
        <Button
          size="sm"
          onClick={onCreated}
          className="bg-zinc-700 hover:bg-zinc-600 text-white"
          disabled={isPending}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Shift
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-400 rounded border border-red-800 bg-red-950/30 px-3 py-2">
          {error}
        </p>
      )}

      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/60">
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">
                Hours
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {shifts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  No shifts defined yet. Add one to start tagging data.
                </td>
              </tr>
            )}
            {shifts.map((shift) => (
              <tr key={shift.id} className="bg-zinc-900/20 hover:bg-zinc-900/40 transition-colors">
                <td className="px-4 py-3 font-medium text-white">{shift.name}</td>
                <td className="px-4 py-3 font-mono text-zinc-300">{shiftSpan(shift)}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      shift.isActive
                        ? 'bg-green-900/40 text-green-400 border border-green-800/40'
                        : 'bg-zinc-800/60 text-zinc-500 border border-zinc-700/40'
                    )}
                  >
                    {shift.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(shift)}
                      disabled={isPending}
                      className="h-7 px-2 text-zinc-400 hover:text-white"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(shift)}
                      disabled={isPending || deletingId === shift.id}
                      className="h-7 px-2 text-zinc-400 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
