import type { Bed } from '../types/bed'

export const SYMPTOM_MAX_LENGTH = 40

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
  /** US-22.1: Symptoms / Complaint field (strict 40-char limit) */
  keySymptom: string
  triageCategory: TriageCategoryType
}

export interface TriageModalProps {
  bed: Bed | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (bedId: string, triageData: TriageData) => Promise<void>
}
