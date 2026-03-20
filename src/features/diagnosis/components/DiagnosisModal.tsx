'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { X, Stethoscope } from 'lucide-react'
import { DiagnosisFormFields } from './DiagnosisFormFields'
import { submitDiagnosis } from '../actions/diagnosis-actions'
import type { DiagnosisState } from '../types/diagnosis.types'
import type { SeverityType } from '../schemas/diagnosis-schemas'

/**
 * Props for the DiagnosisModal component.
 */
interface DiagnosisModalProps {
  /** The current diagnosis state for the bed, if any */
  diagnosisState: DiagnosisState | null
  /** Whether the modal is visible */
  isOpen: boolean
  /** Callback to close the modal */
  onClose: () => void
  /** Callback to trigger on successful submission */
  onSuccess?: () => void
}

/**
 * Doctor-only modal for entering and submitting patient diagnoses.
 */
export function DiagnosisModal({
  diagnosisState,
  isOpen,
  onClose,
  onSuccess,
}: DiagnosisModalProps) {
  const [patientUhid, setPatientUhid] = useState('')
  const [symptomsObserved, setSymptomsObserved] = useState('')
  const [diagnosisText, setDiagnosisText] = useState('')
  const [diagnosisCode, setDiagnosisCode] = useState('')
  const [severity, setSeverity] = useState<SeverityType | ''>('')
  const [recommendedAction, setRecommendedAction] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Reset form when opened
  useEffect(() => {
    if (isOpen && diagnosisState) {
      setPatientUhid(diagnosisState.patientUhid ?? '')
      setSymptomsObserved(diagnosisState.keySymptom ?? '')
      setDiagnosisText('')
      setDiagnosisCode('')
      setSeverity('')
      setRecommendedAction('')
      setErrorMsg(null)
    }
  }, [isOpen, diagnosisState])

  // ESC key to close
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, isSubmitting, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!diagnosisState) return
    if (!patientUhid.trim()) {
      setErrorMsg('Patient UHID is required.')
      return
    }
    if (!severity || !diagnosisText.trim()) {
      setErrorMsg('Diagnosis and Severity are required.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)

    const result = await submitDiagnosis(diagnosisState.bedId, {
      patientUhid: patientUhid.trim(),
      symptomsObserved,
      diagnosisText: diagnosisText.trim(),
      diagnosisCode: diagnosisCode.trim(),
      severity: severity as SeverityType,
      recommendedAction: recommendedAction.trim(),
    })

    setIsSubmitting(false)

    if (result.success) {
      onSuccess?.()
      onClose()
    } else {
      setErrorMsg(result.error ?? 'Failed to save diagnosis')
    }
  }

  if (!isOpen || !diagnosisState) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="diagnosis-modal-title"
    >
      <div className="w-full max-w-md bg-card border border-border shadow-2xl rounded-xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2 text-foreground">
            <Stethoscope className="h-5 w-5 text-primary" />
            <h2 id="diagnosis-modal-title" className="text-lg font-semibold tracking-tight">
              Record Diagnosis
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 border-0 bg-transparent p-1 -mr-2"
            aria-label="Close diagnosis modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Bed identifier */}
          <div className="rounded-lg bg-muted/50 border border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Bed</span>
            <span className="font-semibold text-foreground">{diagnosisState.bedNumber}</span>
          </div>

          <DiagnosisFormFields
            patientUhid={patientUhid}
            symptomsObserved={symptomsObserved}
            diagnosisText={diagnosisText}
            diagnosisCode={diagnosisCode}
            severity={severity}
            recommendedAction={recommendedAction}
            isSubmitting={isSubmitting}
            onSymptomsChange={setSymptomsObserved}
            onDiagnosisTextChange={setDiagnosisText}
            onDiagnosisCodeChange={setDiagnosisCode}
            onSeverityChange={setSeverity}
            onRecommendedActionChange={setRecommendedAction}
            onPatientUhidChange={setPatientUhid}
          />

          {errorMsg && (
            <p className="text-sm text-destructive font-medium" role="alert">{errorMsg}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!patientUhid.trim() || !severity || !diagnosisText.trim() || isSubmitting}
            >
              {isSubmitting ? 'Saving…' : 'Save Diagnosis'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
