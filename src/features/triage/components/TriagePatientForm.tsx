'use client'

import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import {
  TRIAGE_CATEGORY_OPTIONS,
  type PatientGender,
  type TriageCategory,
  type TriagePatientDetails,
} from '../types'
import { SYMPTOM_MAX_LENGTH } from '../schemas'

interface TriagePatientFormProps {
  value: TriagePatientDetails
  disabled: boolean
  onChange: (value: TriagePatientDetails) => void
}

function updateValue<K extends keyof TriagePatientDetails>(
  value: TriagePatientDetails,
  key: K,
  next: TriagePatientDetails[K],
) {
  return { ...value, [key]: next }
}

export function TriagePatientForm({ value, disabled, onChange }: TriagePatientFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="triageCategory">Triage Category</Label>
        <select
          id="triageCategory"
          value={value.triageCategory}
          disabled={disabled}
          onChange={(event) => onChange(updateValue(value, 'triageCategory', event.target.value as TriageCategory))}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {TRIAGE_CATEGORY_OPTIONS.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="patientUhid">Patient UHID</Label>
          <Input
            id="patientUhid"
            value={value.patientUhid}
            disabled={disabled}
            onChange={(event) => onChange(updateValue(value, 'patientUhid', event.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="patientIpdId">IPD ID</Label>
          <Input
            id="patientIpdId"
            value={value.patientIpdId ?? ''}
            disabled={disabled}
            onChange={(event) => onChange(updateValue(value, 'patientIpdId', event.target.value))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="patientName">Patient Name</Label>
        <Input
          id="patientName"
          value={value.patientName}
          disabled={disabled}
          onChange={(event) => onChange(updateValue(value, 'patientName', event.target.value))}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="patientAge">Age</Label>
          <Input
            id="patientAge"
            type="number"
            min={1}
            max={130}
            value={value.patientAge || ''}
            disabled={disabled}
            onChange={(event) => {
              onChange(updateValue(value, 'patientAge', Number(event.target.value)))
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="patientGender">Gender</Label>
          <select
            id="patientGender"
            value={value.patientGender}
            disabled={disabled}
            onChange={(event) => onChange(updateValue(value, 'patientGender', event.target.value as PatientGender))}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
            <option value="Unknown">Unknown</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="keySymptom">Symptoms / Complaint</Label>
        <Textarea
          id="keySymptom"
          value={value.keySymptom}
          maxLength={SYMPTOM_MAX_LENGTH}
          disabled={disabled}
          onChange={(event) => {
            onChange(updateValue(value, 'keySymptom', event.target.value.slice(0, SYMPTOM_MAX_LENGTH)))
          }}
        />
        <p className="text-[10px] text-muted-foreground">{value.keySymptom.length}/{SYMPTOM_MAX_LENGTH}</p>
      </div>
    </div>
  )
}
