'use client'
// ShiftFormDialog — Create / Edit Shift (US-8.1)
// Epic 8: Shift Management

import { useState } from 'react'
import type { Shift } from '../types/shift.types'
import { createShift, updateShift } from '../actions/shift-actions'
import { formatShiftTime } from '../lib/shift-format'

interface Props {
  shift?: Shift
  onClose: () => void
  onSaved: (shift: Shift) => void
}

/** Strip seconds from "HH:MM:SS" → "HH:MM" for the time input value */
function toInputTime(t?: string): string {
  if (!t) return ''
  return t.slice(0, 5)
}

/** Describe whether the shift crosses midnight */
function midnightNote(start: string, end: string): string | null {
  if (!start || !end) return null
  return start > end ? '⚠ This shift crosses midnight (e.g. 22:00 – 06:00).' : null
}

export function ShiftFormDialog({ shift, onClose, onSaved }: Props) {
  const [name, setName] = useState(shift?.name ?? '')
  const [start, setStart] = useState(toInputTime(shift?.start_time))
  const [end, setEnd] = useState(toInputTime(shift?.end_time))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const crossesMidnight = midnightNote(start, end)

  const handleSave = async () => {
    if (!name.trim()) return setError('Shift name is required')
    if (!start) return setError('Start time is required')
    if (!end) return setError('End time is required')
    if (start === end) return setError('Start and end time cannot be the same')

    setLoading(true)
    setError('')

    try {
      if (shift) {
        const res = await updateShift({ id: shift.id, name, start_time: start, end_time: end })
        if (!res.success || !res.shift) {
          setError(res.error ?? 'Failed to update shift')
          return
        }
        onSaved(res.shift)
      } else {
        const res = await createShift({ name, start_time: start, end_time: end })
        if (!res.success || !res.shift) {
          setError(res.error ?? 'Failed to create shift')
          return
        }
        onSaved(res.shift)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4'>
      <div className='bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl'>

        <h2 className='text-xl font-bold text-foreground mb-4'>
          {shift ? 'Edit Shift' : 'Add New Shift'}
        </h2>

        {/* Name */}
        <label className='block text-sm font-semibold text-muted-foreground mb-1'>
          Shift Name <span className='text-muted-foreground/60 font-normal'>({name.length}/100)</span>
        </label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={100}
          disabled={shift?.is_default}
          className='w-full border border-border bg-background rounded-lg px-3 py-2 mb-4 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-muted disabled:text-muted-foreground'
          placeholder='e.g. Morning'
        />

        {/* Times */}
        <div className='grid grid-cols-2 gap-4 mb-1'>
          <div>
            <label className='block text-sm font-semibold text-muted-foreground mb-1'>Start Time</label>
            <input
              type='time'
              value={start}
              onChange={e => setStart(e.target.value)}
              className='w-full border border-border bg-background rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>
          <div>
            <label className='block text-sm font-semibold text-muted-foreground mb-1'>End Time</label>
            <input
              type='time'
              value={end}
              onChange={e => setEnd(e.target.value)}
              className='w-full border border-border bg-background rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>
        </div>

        {/* Preview */}
        {start && end && (
          <p className='text-xs text-muted-foreground mb-1'>
            Range: <span className='font-medium text-foreground'>{formatShiftTime(start, end)}</span>
          </p>
        )}

        {/* Midnight warning */}
        {crossesMidnight && (
          <p className='text-xs text-amber-400 bg-amber-900/20 border border-amber-800/50 rounded px-2 py-1 mb-4'>
            {crossesMidnight}
          </p>
        )}

        {!crossesMidnight && <div className='mb-4' />}

        {/* Error */}
        {error && <p className='text-red-500 text-sm mb-3'>{error}</p>}

        <div className='flex justify-end gap-3'>
          <button
            onClick={onClose}
            className='px-4 py-2 border border-border rounded-lg text-foreground font-medium hover:bg-muted transition-colors'>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className='px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50'>
            {loading ? 'Saving...' : 'Save Shift'}
          </button>
        </div>

      </div>
    </div>
  )
}
