import { z } from 'zod'
import {
  TRIAGE_CATEGORY_OPTIONS,
  TRIAGE_DECISION_OUTCOMES,
  TRIAGE_STATES,
  type TriagePatientDetails,
  type TriageState,
} from './types'

export const SYMPTOM_MAX_LENGTH = 40

const patientDetailsSchema = z.object({
  patientUhid: z.string().trim().min(1, 'UHID is required').max(100),
  patientIpdId: z.string().trim().max(100).optional().nullable(),
  patientName: z.string().trim().min(1, 'Patient name is required').max(255),
  patientAge: z.number().int().min(1).max(130),
  patientGender: z.enum(['Male', 'Female', 'Other', 'Unknown']),
  keySymptom: z.string().trim().max(SYMPTOM_MAX_LENGTH).default(''),
  triageCategory: z.enum(TRIAGE_CATEGORY_OPTIONS),
})

export const assignTriagePatientSchema = z.object({
  bedId: z.string().uuid('Invalid bed ID'),
  patient: patientDetailsSchema,
})

export const updateTriageDetailsSchema = assignTriagePatientSchema

export const transitionTriageBedSchema = z.object({
  bedId: z.string().uuid('Invalid bed ID'),
  toState: z.enum(TRIAGE_STATES),
})

export const triageDecisionSchema = z.object({
  bedId: z.string().uuid('Invalid bed ID'),
  outcome: z.enum(TRIAGE_DECISION_OUTCOMES),
  erBedId: z.string().uuid('Invalid ER bed ID').optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.outcome === 'shift_to_er' && !data.erBedId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['erBedId'],
      message: 'Select an ER bed for transfer.',
    })
  }
})

export type AssignTriagePatientInput = z.infer<typeof assignTriagePatientSchema>
export type UpdateTriageDetailsInput = z.infer<typeof updateTriageDetailsSchema>
export type TransitionTriageBedInput = z.infer<typeof transitionTriageBedSchema>
export type TriageDecisionInput = z.infer<typeof triageDecisionSchema>

export function normalizePatientDetails(patient: TriagePatientDetails): TriagePatientDetails {
  return {
    patientUhid: patient.patientUhid.trim(),
    patientIpdId: patient.patientIpdId?.trim() || null,
    patientName: patient.patientName.trim(),
    patientAge: Math.floor(patient.patientAge),
    patientGender: patient.patientGender,
    keySymptom: patient.keySymptom.trim(),
    triageCategory: patient.triageCategory,
  }
}

export type ParsedTriageState = TriageState
