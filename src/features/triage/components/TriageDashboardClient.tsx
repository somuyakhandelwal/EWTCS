'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { assignTriagePatient, transitionTriageBed, updateTriagePatientDetails } from '../actions'
import {
  TRIAGE_STATE_LABELS,
  type TriageBed,
  type TriagePatientDetails,
  type TriageState,
} from '../types'
import { TriageBedCard } from './TriageBedCard'
import { TriagePatientModal } from './TriagePatientModal'

interface TriageDashboardClientProps {
  initialBeds: TriageBed[]
}

type ModalState = { bed: TriageBed; mode: 'assign' | 'edit' } | null

const NEXT_STATE: Partial<Record<TriageState, TriageState>> = {
  initial_treatment: 'decision_made',
  decision_made: 'cleaning',
  cleaning: 'empty',
}

function nextActionState(bed: TriageBed) {
  return NEXT_STATE[bed.state]
}

export function TriageDashboardClient({ initialBeds }: TriageDashboardClientProps) {
  const router = useRouter()
  const [beds, setBeds] = useState(initialBeds)
  const [modalState, setModalState] = useState<ModalState>(null)
  const [pendingBedId, setPendingBedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => setBeds(initialBeds), [initialBeds])

  const counts = useMemo(() => ({
    total: beds.length,
    occupied: beds.filter((bed) => bed.state === 'initial_treatment' || bed.state === 'decision_made').length,
    cleaning: beds.filter((bed) => bed.state === 'cleaning').length,
    empty: beds.filter((bed) => bed.state === 'empty').length,
  }), [beds])

  const refreshAfterSuccess = () => {
    setError(null)
    setModalState(null)
    router.refresh()
  }

  const handlePatientSubmit = (bedId: string, patient: TriagePatientDetails) => {
    const mode = modalState?.mode
    setPendingBedId(bedId)
    startTransition(async () => {
      const result = mode === 'assign'
        ? await assignTriagePatient({ bedId, patient })
        : await updateTriagePatientDetails({ bedId, patient })
      setPendingBedId(null)
      if (!result.success) {
        setError(result.error || 'Please check the triage details.')
        return
      }
      refreshAfterSuccess()
    })
  }

  const handleTransition = (bed: TriageBed) => {
    const toState = nextActionState(bed)
    if (!toState) return
    setPendingBedId(bed.id)
    startTransition(async () => {
      const result = await transitionTriageBed({ bedId: bed.id, toState })
      setPendingBedId(null)
      if (!result.success) {
        setError(result.error || `Could not move bed to ${TRIAGE_STATE_LABELS[toState]}.`)
        return
      }
      refreshAfterSuccess()
    })
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Summary label="Total" value={counts.total} />
        <Summary label="Occupied" value={counts.occupied} />
        <Summary label="Cleaning" value={counts.cleaning} />
        <Summary label="Empty" value={counts.empty} />
      </div>

      {error && !modalState && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {beds.map((bed) => (
          <TriageBedCard
            key={bed.id}
            bed={bed}
            isPending={(isPending && pendingBedId === bed.id) || Boolean(pendingBedId)}
            onAssign={(nextBed) => { setError(null); setModalState({ bed: nextBed, mode: 'assign' }) }}
            onEdit={(nextBed) => { setError(null); setModalState({ bed: nextBed, mode: 'edit' }) }}
            onTransition={handleTransition}
          />
        ))}
      </div>

      <TriagePatientModal
        bed={modalState?.bed ?? null}
        mode={modalState?.mode ?? 'assign'}
        isOpen={Boolean(modalState)}
        isSubmitting={isPending}
        error={modalState ? error : null}
        onClose={() => { setError(null); setModalState(null) }}
        onSubmit={handlePatientSubmit}
      />
    </div>
  )
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}
