// Diagnosis Types — Shared
// Used by: diagnosis, bed-dashboard
// Shared to avoid cross-feature imports between bed-dashboard and diagnosis.

/** State for the diagnosis modal (which bed is being diagnosed) */
export interface DiagnosisState {
  bedId: string
  bedNumber: string
  patientUhid: string
  /** Pre-filled symptom from triage data */
  keySymptom?: string | null
}
