import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import type { RefObject } from 'react'
import {
  SYMPTOM_MAX_LENGTH,
  type PatientGenderType,
  type TriageCategoryType,
} from './triage-modal.types'

interface TriageModalFormFieldsProps {
  firstInputRef: RefObject<HTMLSelectElement | null>
  isSubmitting: boolean
  triageCategory: TriageCategoryType | ''
  patientUhid: string
  patientIpdId: string
  patientName: string
  patientAge: string
  patientGender: PatientGenderType | ''
  keySymptom: string
  setTriageCategory: (value: TriageCategoryType | '') => void
  setPatientUhid: (value: string) => void
  setPatientIpdId: (value: string) => void
  setPatientName: (value: string) => void
  setPatientAge: (value: string) => void
  setPatientGender: (value: PatientGenderType | '') => void
  setKeySymptom: (value: string) => void
}

export function TriageModalFormFields({
  firstInputRef,
  isSubmitting,
  triageCategory,
  patientUhid,
  patientIpdId,
  patientName,
  patientAge,
  patientGender,
  keySymptom,
  setTriageCategory,
  setPatientUhid,
  setPatientIpdId,
  setPatientName,
  setPatientAge,
  setPatientGender,
  setKeySymptom,
}: TriageModalFormFieldsProps) {
  const symptomLength = keySymptom.length

  return (
    <>
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
            <option value="Resuscitation">Resuscitation (Level 1)</option>
            <option value="Emergent">Emergent (Level 2)</option>
            <option value="Urgent">Urgent (Level 3)</option>
            <option value="Less Urgent">Less Urgent (Level 4)</option>
            <option value="Non-Urgent">Non-Urgent (Level 5)</option>
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
        <Label htmlFor="patientIpdId">IPD ID <span className="text-muted-foreground text-xs">(optional)</span></Label>
        <Input
          id="patientIpdId"
          value={patientIpdId}
          onChange={(e) => setPatientIpdId(e.target.value)}
          placeholder="e.g. IPD-2026-0091"
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="patientAge">Age <span className="text-destructive">*</span></Label>
          <Input
            id="patientAge"
            type="number"
            min={0}
            max={130}
            value={patientAge}
            onChange={(e) => setPatientAge(e.target.value)}
            placeholder="e.g. 42"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="patientGender">Gender <span className="text-destructive">*</span></Label>
          <select
            id="patientGender"
            value={patientGender}
            onChange={(e) => setPatientGender(e.target.value as PatientGenderType)}
            required
            disabled={isSubmitting}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
          >
            <option value="" disabled>Select gender...</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
            <option value="Unknown">Unknown</option>
          </select>
        </div>
      </div>

      <div className="space-y-2 flex flex-col border-0">
        <Label htmlFor="keySymptom">Symptoms / Complaint</Label>
        <textarea
          id="keySymptom"
          value={keySymptom}
          onChange={(e) => setKeySymptom(e.target.value.slice(0, SYMPTOM_MAX_LENGTH))}
          maxLength={SYMPTOM_MAX_LENGTH}
          placeholder="e.g. Chest pain, Road traffic accident trauma"
          rows={3}
          disabled={isSubmitting}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        />
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Examples: Chest pain, Road traffic accident trauma</span>
          <span>{symptomLength}/{SYMPTOM_MAX_LENGTH}</span>
        </div>
      </div>
    </>
  )
}
