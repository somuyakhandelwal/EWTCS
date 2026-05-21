export const TRIAGE_BED_NUMBERS = [
  'TRIAGE-01',
  'TRIAGE-02',
  'TRIAGE-03',
  'TRIAGE-04',
  'TRIAGE-05',
  'TRIAGE-06',
] as const

export const TRIAGE_STATES = [
  'empty',
  'initial_treatment',
  'decision_made',
  'cleaning',
] as const

export type TriageState = (typeof TRIAGE_STATES)[number]

export const TRIAGE_DECISION_OUTCOMES = [
  'shift_to_er',
  'shift_to_icu_ot',
  'discharge',
] as const

export type TriageDecisionOutcome = (typeof TRIAGE_DECISION_OUTCOMES)[number]

export const TRIAGE_DECISION_LABELS: Record<TriageDecisionOutcome, string> = {
  shift_to_er: 'Shift to ER',
  shift_to_icu_ot: 'Shift to ICU/OT',
  discharge: 'Discharge',
}

export const TRIAGE_STATE_LABELS: Record<TriageState, string> = {
  empty: 'Empty',
  initial_treatment: 'Initial Treatment',
  decision_made: 'Decision Made',
  cleaning: 'Cleaning',
}

export const TRIAGE_STATE_STYLES: Record<TriageState, {
  accent: string
  border: string
  badge: string
}> = {
  empty: {
    accent: 'bg-slate-500',
    border: 'border-slate-300 dark:border-slate-700',
    badge: 'border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
  },
  initial_treatment: {
    accent: 'bg-cyan-500',
    border: 'border-cyan-300 dark:border-cyan-800',
    badge: 'border-cyan-300 bg-cyan-100 text-cyan-950 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-100',
  },
  decision_made: {
    accent: 'bg-emerald-500',
    border: 'border-emerald-300 dark:border-emerald-800',
    badge: 'border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100',
  },
  cleaning: {
    accent: 'bg-pink-500',
    border: 'border-pink-300 dark:border-pink-800',
    badge: 'border-pink-300 bg-pink-100 text-pink-950 dark:border-pink-800 dark:bg-pink-950 dark:text-pink-100',
  },
}

export const TRIAGE_CATEGORY_OPTIONS = [
  'Resuscitation',
  'Emergent',
  'Urgent',
  'Less Urgent',
  'Non-Urgent',
] as const

export type TriageCategory = (typeof TRIAGE_CATEGORY_OPTIONS)[number]
export type PatientGender = 'Male' | 'Female' | 'Other' | 'Unknown'

export interface TriagePatientDetails {
  patientUhid: string
  patientIpdId?: string | null
  patientName: string
  patientAge: number
  patientGender: PatientGender
  keySymptom: string
  triageCategory: TriageCategory
}

export interface TriageBed {
  id: string
  bedNumber: string
  state: TriageState
  lastStateChange: Date
  patientStartTime: Date | null
  patient: Partial<TriagePatientDetails> | null
}

export interface ErBedOption {
  id: string
  bedNumber: string
  currentStageName: string
}

export interface TriageDashboardData {
  beds: TriageBed[]
}
