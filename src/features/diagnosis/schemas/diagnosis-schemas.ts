import { z } from 'zod'

export const SEVERITY_OPTIONS = ['MILD', 'MODERATE', 'SEVERE', 'CRITICAL'] as const
export type SeverityType = typeof SEVERITY_OPTIONS[number]

export const diagnosisSchema = z.object({
  /** Pre-filled from bed.metadata.triageInfo.patientUhid — read-only in form */
  patientUhid: z.string().min(1, 'Patient UHID is required'),

  /**
   * Symptoms as observed by the doctor during examination.
   * Pre-filled from triage keySymptom but editable.
   */
  symptomsObserved: z
    .string()
    .max(500, 'Symptoms must be 500 characters or fewer')
    .optional()
    .default(''),

  /** The primary clinical diagnosis — required */
  diagnosisText: z
    .string()
    .min(1, 'Diagnosis is required')
    .max(1000, 'Diagnosis must be 1000 characters or fewer'),

  /** Optional ICD-10 or local coding system code */
  diagnosisCode: z
    .string()
    .max(20, 'Code must be 20 characters or fewer')
    .optional()
    .default(''),

  /** Clinical severity assessment */
  severity: z.enum(SEVERITY_OPTIONS, {
    message: 'Please select a severity level',
  }),

  /** Recommended next clinical action */
  recommendedAction: z
    .string()
    .max(500, 'Recommended action must be 500 characters or fewer')
    .optional()
    .default(''),
})

export type DiagnosisFormData = z.infer<typeof diagnosisSchema>
