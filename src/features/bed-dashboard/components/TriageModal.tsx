import { useEffect, useState, useRef } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import type { Bed } from '../types/bed'
import { X, Activity } from 'lucide-react'

type TriageCategoryType = 'Resuscitation' | 'Emergent' | 'Urgent' | 'Less Urgent' | 'Non-Urgent'

interface TriageModalProps {
  bed: Bed | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (bedId: string, triageData: {
    patientUhid: string
    patientName: string
    keySymptom: string
    triageCategory: TriageCategoryType
  }) => Promise<void>
}

export function TriageModal({ bed, isOpen, onClose, onSubmit }: TriageModalProps) {
  const [patientUhid, setPatientUhid] = useState('')
  const [patientName, setPatientName] = useState('')
  const [keySymptom, setKeySymptom] = useState('')
  const [triageCategory, setTriageCategory] = useState<TriageCategoryType | ''>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const firstInputRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    if (isOpen && bed) {
      setPatientUhid(bed.metadata?.triageInfo?.patientUhid || '')
      setPatientName(bed.metadata?.triageInfo?.patientName || '')
      setKeySymptom(bed.metadata?.triageInfo?.keySymptom || '')
      setTriageCategory(bed.metadata?.triageInfo?.triageCategory || '')
      
      setTimeout(() => firstInputRef.current?.focus(), 50)
    } else {
      setPatientUhid('')
      setPatientName('')
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
    if (!bed || !triageCategory) return
    setIsSubmitting(true)
    try {
      await onSubmit(bed.id, {
        patientUhid,
        patientName,
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

          <div className="space-y-2">
            <Label htmlFor="triageCategory">Triage Category <span className="text-destructive">*</span></Label>
            <div className="relative">
              <select
                id="triageCategory"
                ref={firstInputRef}
                value={triageCategory}
                onChange={(e) => setTriageCategory(e.target.value as TriageCategoryType)}
                required
                disabled={isSubmitting}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
              >
                <option value="" disabled>Select priority level...</option>
                <option value="Resuscitation">��� Resuscitation (Level 1)</option>
                <option value="Emergent">��� Emergent (Level 2)</option>
                <option value="Urgent">��� Urgent (Level 3)</option>
                <option value="Less Urgent">��� Less Urgent (Level 4)</option>
                <option value="Non-Urgent">��� Non-Urgent (Level 5)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="patientUhid">Patient UHID</Label>
            <Input
              id="patientUhid"
              value={patientUhid}
              onChange={(e) => setPatientUhid(e.target.value)}
              placeholder="e.g. UHID-12345"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="patientName">Patient Name</Label>
            <Input
              id="patientName"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Doe, John"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2 flex flex-col border-0">
            <Label htmlFor="keySymptom">Key Symptom</Label>
            <textarea
              id="keySymptom"
              value={keySymptom}
              onChange={(e) => setKeySymptom(e.target.value)}
              placeholder="Primary complaint..."
              rows={3}
              disabled={isSubmitting}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

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
              disabled={!triageCategory || isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Triage Details'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
