import type { SeverityType } from '../schemas/diagnosis-schemas'

// Re-export DiagnosisState from shared — keeps the original import path working
// and avoids cross-feature imports into bed-dashboard.
export type { DiagnosisState } from '@/shared/types/diagnosis.types'

/** A diagnosis record as returned from the database */
export interface DiagnosisRecord {
  id: string
  bed_id: string
  patient_uhid: string | null
  doctor_id: string
  symptoms_observed: string | null
  clinical_findings: string | null
  diagnosis_code: string | null
  diagnosis_text: string | null
  severity: SeverityType | null
  recommended_action: string | null
  diagnosed_at: string
  created_at: string
  updated_at: string
  // Joined from users table
  doctor_username?: string | null
  doctor_name?: string | null
}

/** Result of submitting a diagnosis */
export interface DiagnosisActionResult {
  success: boolean
  error?: string
  diagnosisId?: string
}
