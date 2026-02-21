'use client'
// ShiftList — Admin manage shifts (US-8.1)
// Epic 8: Shift Management

import { useState } from 'react'
import type { Shift } from '../types/shift.types'
import { deleteShift } from '../actions/shift-actions'
import { ShiftFormDialog } from './ShiftFormDialog'
import { formatShiftTime } from '../lib/shift-format'

interface Props {
  initialShifts: Shift[]
}

export function ShiftList({ initialShifts }: Props) {
  const [shifts, setShifts]   = useState<Shift[]>(initialShifts)
  const [editing, setEditing] = useState<Shift | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const handleDelete = async (shift: Shift) => {
    if (!confirm(`Delete shift "${shift.name}"?`)) return
    const res = await deleteShift(shift.id)
    if (!res.success) {
      alert(res.error ?? 'Failed to delete shift')
      return
    }
    setShifts(prev => prev.filter(s => s.id !== shift.id))
  }

  return (
    <div className='space-y-3'>
      <button
        onClick={() => setShowAdd(true)}
        className='px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700'>
        + Add New Shift
      </button>

      {shifts.length === 0 && (
        <p className='text-gray-500 text-sm py-4'>No shifts configured.</p>
      )}

      {shifts.map(shift => (
        <div
          key={shift.id}
          className='flex items-center justify-between p-4 rounded-lg border-2 border-zinc-700 bg-zinc-800'>

          <div className='flex flex-col gap-0.5'>
            <div className='flex items-center gap-3'>
              <span className='font-semibold text-base text-white'>{shift.name}</span>
              {shift.is_default && (
                <span className='text-xs bg-zinc-900/60 px-2 py-0.5 rounded-full text-zinc-300 border border-zinc-600'>
                  Default
                </span>
              )}
              {!shift.is_active && (
                <span className='text-xs bg-red-900/40 px-2 py-0.5 rounded-full text-red-400 border border-red-800'>
                  Inactive
                </span>
              )}
              {shift.crosses_midnight && (
                <span className='text-xs bg-amber-900/30 px-2 py-0.5 rounded-full text-amber-400 border border-amber-800'>
                  Crosses Midnight
                </span>
              )}
            </div>
            <span className='text-sm text-zinc-400 font-mono'>
              {formatShiftTime(shift.start_time, shift.end_time)}
            </span>
          </div>

          <div className='flex gap-2'>
            <button
              onClick={() => setEditing(shift)}
              className='px-3 py-1 bg-white border border-gray-400 rounded text-gray-800 font-medium text-sm hover:bg-gray-100'>
              Edit
            </button>
            {!shift.is_default && (
              <button
                onClick={() => handleDelete(shift)}
                className='px-3 py-1 bg-red-500 border border-red-600 rounded text-white font-medium text-sm hover:bg-red-600'>
                Delete
              </button>
            )}
          </div>
        </div>
      ))}

      {(showAdd || editing) && (
        <ShiftFormDialog
          shift={editing ?? undefined}
          onClose={() => { setShowAdd(false); setEditing(null) }}
          onSaved={(saved) => {
            if (editing) {
              setShifts(prev => prev.map(s => s.id === saved.id ? saved : s))
            } else {
              setShifts(prev => [...prev, saved])
            }
            setShowAdd(false)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
