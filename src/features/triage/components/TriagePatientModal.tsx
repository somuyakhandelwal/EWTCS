'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { type TriageBed, type TriagePatientDetails } from '../types'
import { TriagePatientForm } from './TriagePatientForm'

interface TriagePatientModalProps {
  bed: TriageBed | null
  mode: 'assign' | 'edit'
  isOpen: boolean
  isSubmitting: boolean
  error: string | null
  onClose: () => void
  onSubmit: (bedId: string, details: TriagePatientDetails) => void
}

const EMPTY_PATIENT: TriagePatientDetails = {
  patientUhid: '',
  patientIpdId: '',
  patientName: '',
  patientAge: 0,
  patientGender: 'Unknown',
  keySymptom: '',
  triageCategory: 'Urgent',
}

function detailsFromBed(bed: TriageBed | null): TriagePatientDetails {
  if (!bed?.patient) return EMPTY_PATIENT
  return {
    patientUhid: bed.patient.patientUhid ?? '',
    patientIpdId: bed.patient.patientIpdId ?? '',
    patientName: bed.patient.patientName ?? '',
    patientAge: bed.patient.patientAge ?? 0,
    patientGender: bed.patient.patientGender ?? 'Unknown',
    keySymptom: bed.patient.keySymptom ?? '',
    triageCategory: bed.patient.triageCategory ?? 'Urgent',
  }
}

export function TriagePatientModal({
  bed,
  mode,
  isOpen,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: TriagePatientModalProps) {
  const [details, setDetails] = useState<TriagePatientDetails>(EMPTY_PATIENT)

  useEffect(() => {
    if (isOpen) setDetails(detailsFromBed(bed))
  }, [bed, isOpen])

  if (!isOpen || !bed) return null

  const title = mode === 'assign' ? `Assign ${bed.bedNumber}` : `Edit ${bed.bedNumber}`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="triage-patient-title"
    >
      <div className="w-full max-w-2xl rounded-lg border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 id="triage-patient-title" className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">Triage details stay inside the triage area workflow.</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={isSubmitting}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form
          className="space-y-4 p-4"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit(bed.id, details)
          }}
        >
          <TriagePatientForm value={details} disabled={isSubmitting} onChange={setDetails} />
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {mode === 'assign' ? 'Assign Patient' : 'Save Details'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
