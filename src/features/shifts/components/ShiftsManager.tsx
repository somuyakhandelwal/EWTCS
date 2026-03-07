// Shifts Manager — Admin Page Client Wrapper
// EPIC 8: Shift Management (US-8.1)
// Purpose: Orchestrates the ShiftsTable + ShiftForm into a single CRUD panel.

'use client'

import { useState } from 'react'
import { ShiftsTable } from './ShiftsTable'
import { ShiftForm } from './ShiftForm'
import type { Shift } from '../types/shift'

interface ShiftsManagerProps {
  initialShifts: Shift[]
}

type Mode = 'list' | 'create' | 'edit'

export function ShiftsManager({ initialShifts }: ShiftsManagerProps) {
  const [shifts, setShifts] = useState<Shift[]>(initialShifts)
  const [mode, setMode] = useState<Mode>('list')
  const [editTarget, setEditTarget] = useState<Shift | null>(null)

  function handleEdit(shift: Shift) {
    setEditTarget(shift)
    setMode('edit')
  }

  function handleFormSuccess(saved: Shift) {
    setShifts((prev) => {
      const idx = prev.findIndex((s) => s.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [...prev, saved]
    })
    setMode('list')
    setEditTarget(null)
  }

  function handleDeleted() {
    // Re-fetch is simpler — reload the full list via router, but here we do
    // optimistic removal: remove the one being deleted.
    // The table calls onDeleted; we'll just reload the page via router.
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      {mode === 'list' && (
        <ShiftsTable
          shifts={shifts}
          onEdit={handleEdit}
          onCreated={() => setMode('create')}
          onDeleted={handleDeleted}
        />
      )}
      {(mode === 'create' || mode === 'edit') && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
          <ShiftForm
            initial={mode === 'edit' ? editTarget ?? undefined : undefined}
            onSuccess={handleFormSuccess}
            onCancel={() => { setMode('list'); setEditTarget(null) }}
          />
        </div>
      )}
    </div>
  )
}
