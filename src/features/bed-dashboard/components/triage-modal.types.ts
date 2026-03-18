import type { Bed } from '../types/bed'

export type TriageCategoryType =
  | 'Resuscitation'
  | 'Emergent'
  | 'Urgent'
  | 'Less Urgent'
  | 'Non-Urgent'

export type PatientGenderType = 'Male' | 'Female' | 'Other' | 'Unknown'

export interface TriageData {
  patientUhid: string
  patientIpdId?: string | null
  patientName: string
  patientAge: number
  patientGender: PatientGenderType
  keySymptom: string
  triageCategory: TriageCategoryType
}

export interface TriageModalProps {
  bed: Bed | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (bedId: string, triageData: TriageData) => Promise<void>
}
