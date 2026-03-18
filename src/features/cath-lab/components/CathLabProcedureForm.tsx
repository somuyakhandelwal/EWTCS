'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { createCathLabProcedureAction } from '../actions/cath-lab-actions'

const DEFAULT_PROCEDURE_TYPE = 'CAG'

function toIso(localDateTime: string): string {
  return new Date(localDateTime).toISOString()
}

export function CathLabProcedureForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [procedureType, setProcedureType] = useState<'CAG' | 'PTCA'>(DEFAULT_PROCEDURE_TYPE)
  const [patientId, setPatientId] = useState('')
  const [cardiologist, setCardiologist] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [outcome, setOutcome] = useState('')

  function resetForm() {
    setProcedureType(DEFAULT_PROCEDURE_TYPE)
    setPatientId('')
    setCardiologist('')
    setStartTime('')
    setEndTime('')
    setOutcome('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await createCathLabProcedureAction({
        procedureType,
        patientId,
        cardiologist,
        startTime: toIso(startTime),
        endTime: toIso(endTime),
        outcome,
      })

      if (!result.success) {
        setError(result.error ?? 'Failed to save procedure log')
        return
      }

      resetForm()
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-4 space-y-4">
      <h2 className="font-semibold text-card-foreground">Log Cath Lab Procedure</h2>

      <div className="space-y-2">
        <Label htmlFor="procedureType">Procedure Type</Label>
        <select
          id="procedureType"
          value={procedureType}
          onChange={(e) => setProcedureType(e.target.value as 'CAG' | 'PTCA')}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          disabled={isPending}
          required
        >
          <option value="CAG">CAG</option>
          <option value="PTCA">PTCA</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="patientId">Patient ID</Label>
        <Input id="patientId" value={patientId} onChange={(e) => setPatientId(e.target.value)} required disabled={isPending} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cardiologist">Cardiologist</Label>
        <Input id="cardiologist" value={cardiologist} onChange={(e) => setCardiologist(e.target.value)} required disabled={isPending} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="startTime">Start Time</Label>
          <Input id="startTime" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required disabled={isPending} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">End Time</Label>
          <Input id="endTime" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required disabled={isPending} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="outcome">Outcome</Label>
        <textarea
          id="outcome"
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          rows={3}
          disabled={isPending}
          required
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Save Procedure Log'}
      </Button>
    </form>
  )
}
