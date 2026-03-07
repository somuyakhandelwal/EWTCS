// Shift Form Component — Admin
// EPIC 8: Shift Management (US-8.1)
// Purpose: Create or edit a shift definition.

'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { createShiftAction, updateShiftAction } from '../actions/shift-actions'
import type { Shift } from '../types/shift'

interface ShiftFormProps {
  /** When set, the form is in edit mode. */
  initial?: Shift
  onSuccess: (shift: Shift) => void
  onCancel: () => void
}

function padTime(t: string): string {
  // Normalise "HH:MM:SS" → "HH:MM" for the input element
  return t.slice(0, 5)
}

export function ShiftForm({ initial, onSuccess, onCancel }: ShiftFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [startTime, setStartTime] = useState(initial ? padTime(initial.startTime) : '06:00')
  const [endTime, setEndTime] = useState(initial ? padTime(initial.endTime) : '14:00')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isEditing = !!initial

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = isEditing
        ? await updateShiftAction({ id: initial.id, name, startTime, endTime, isActive })
        : await createShiftAction({ name, startTime, endTime })

      if (!result.success) {
        setError(result.error ?? 'Operation failed')
        return
      }

      onSuccess(result.shift!)
    })
  }

  const inputClass = cn(
    'w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white',
    'placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500',
    'disabled:opacity-50'
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-base font-semibold text-white">
        {isEditing ? `Edit "${initial.name}"` : 'New Shift'}
      </h3>

      <div>
        <label className="block text-xs text-zinc-400 mb-1" htmlFor="shift-name">
          Shift Name
        </label>
        <input
          id="shift-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Morning"
          required
          maxLength={100}
          disabled={isPending}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-1" htmlFor="shift-start">
            Start Time (24 h)
          </label>
          <input
            id="shift-start"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            disabled={isPending}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1" htmlFor="shift-end">
            End Time (24 h)
          </label>
          <input
            id="shift-end"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
            disabled={isPending}
            className={inputClass}
          />
          {endTime <= startTime && (
            <p className="text-xs text-amber-400 mt-1">Crosses midnight (+1 day)</p>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="flex items-center gap-2">
          <input
            id="shift-active"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={isPending}
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 accent-green-500"
          />
          <label htmlFor="shift-active" className="text-sm text-zinc-300">
            Active (used for tagging new log entries)
          </label>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-zinc-700 hover:bg-zinc-600 text-white"
          size="sm"
        >
          {isPending ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Shift'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isPending}
          className="border-zinc-700 text-zinc-400 hover:text-white"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
