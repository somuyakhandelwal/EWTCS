import { useEffect, useState, useRef } from 'react'
import { Button } from '@/shared/components/ui/button'
import { X, Activity } from 'lucide-react'
import { TriageModalFormFields } from './TriageModalFormFields'
import type {
  TriageCategoryType,
  PatientGenderType,
  TriageModalProps,
} from './triage-modal.types'



export function TriageModal({ bed, isOpen, onClose, onSubmit }: TriageModalProps) {
  const [patientUhid, setPatientUhid] = useState('')
  const [patientIpdId, setPatientIpdId] = useState('')
  const [patientName, setPatientName] = useState('')
  const [patientAge, setPatientAge] = useState('')
  const [patientGender, setPatientGender] = useState<PatientGenderType | ''>('')
  const [keySymptom, setKeySymptom] = useState('')
  const [triageCategory, setTriageCategory] = useState<TriageCategoryType | ''>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const firstInputRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    if (isOpen && bed) {
      setPatientUhid(bed.metadata?.triageInfo?.patientUhid || '')
      setPatientIpdId(bed.metadata?.triageInfo?.patientIpdId || '')
      setPatientName(bed.metadata?.triageInfo?.patientName || '')
      setPatientAge(
        typeof bed.metadata?.triageInfo?.patientAge === 'number'
          ? String(bed.metadata?.triageInfo?.patientAge)
          : ''
      )
      setPatientGender(bed.metadata?.triageInfo?.patientGender || '')
      setKeySymptom(bed.metadata?.triageInfo?.keySymptom || '')
      setTriageCategory(bed.metadata?.triageInfo?.triageCategory || '')
      
      setTimeout(() => firstInputRef.current?.focus(), 50)
    } else {
      setPatientUhid('')
      setPatientIpdId('')
      setPatientName('')
      setPatientAge('')
      setPatientGender('')
      setKeySymptom('')
      setTriageCategory('')
    }
  }, [isOpen, bed])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bed || !triageCategory || !patientGender) return
    const parsedAge = Number(patientAge)
    if (!Number.isFinite(parsedAge) || parsedAge <= 0) return

    setIsSubmitting(true)
    try {
      await onSubmit(bed.id, {
        patientUhid: patientUhid.trim(),
        patientIpdId: patientIpdId.trim() ? patientIpdId.trim() : null,
        patientName: patientName.trim(),
        patientAge: Math.floor(parsedAge),
        patientGender,
        keySymptom,
        triageCategory: triageCategory as TriageCategoryType
      })
      onClose()
    } catch {
      // Error handled by parent
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !bed) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-card border border-border shadow-2xl rounded-xl flex flex-col max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="triage-modal-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2 text-foreground">
            <Activity className="h-5 w-5 text-primary" />
            <h2 id="triage-modal-title" className="text-lg font-semibold tracking-tight">
              Triage Assessment
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 border-0 bg-transparent p-1 -mr-2"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
           <div className="rounded-lg bg-muted/50 border border-border px-4 py-3 mb-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Bed</span>
              <span className="font-semibold text-foreground">{bed.bedNumber}</span>
           </div>

          <TriageModalFormFields
            firstInputRef={firstInputRef}
            isSubmitting={isSubmitting}
            triageCategory={triageCategory}
            patientUhid={patientUhid}
            patientIpdId={patientIpdId}
            patientName={patientName}
            patientAge={patientAge}
            patientGender={patientGender}
            keySymptom={keySymptom}
            setTriageCategory={setTriageCategory}
            setPatientUhid={setPatientUhid}
            setPatientIpdId={setPatientIpdId}
            setPatientName={setPatientName}
            setPatientAge={setPatientAge}
            setPatientGender={setPatientGender}
            setKeySymptom={setKeySymptom}
          />

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!triageCategory || !patientGender || !patientAge || isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Triage Details'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
