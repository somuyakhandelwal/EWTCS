// Bed Dashboard Types
// Epic 1: Nurse Desk Bed Dashboard

export type BedStatus = 'empty' | 'occupied' | 'cleaning'

// US-1.6 / US-1.7: Disposition bottleneck delay reasons
export type DispositionDelayReason =
  | 'no_icu_bed'
  | 'no_general_ward_bed'
  | 'no_bed_upstairs'
  | 'awaiting_transport'
  | 'family_consent'
  | 'awaiting_specialist'
  | 'other'

export const DISPOSITION_DELAY_REASON_LABELS: Record<DispositionDelayReason, string> = {
  no_icu_bed: 'No ICU Bed',
  no_general_ward_bed: 'No General Ward Bed',
  no_bed_upstairs: 'No Bed Upstairs',
  awaiting_transport: 'Awaiting Transport',
  family_consent: 'Awaiting Family Consent',
  awaiting_specialist: 'Awaiting Specialist',
  other: 'Other',
}

/** Threshold in ms before a patient in Decision Made is flagged as a bottleneck (30 min) */
export const DISPOSITION_BOTTLENECK_THRESHOLD_MS = 30 * 60 * 1000

export interface Stage {
  id: string
  name: string
  displayOrder: number
  colorCode: string
  description: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Bed {
  id: string
  bedNumber: string
  currentStageId: string | null
  currentStage: Stage | null
  patientStartTime: Date | null
  lastStageChange: Date | null
  isOccupied: boolean
  isActive: boolean
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface BedWithElapsedTime extends Bed {
  elapsedTimeMs: number | null
  isDelayed: boolean
  // US-1.6: Disposition bottleneck fields
  isDispositionBottleneck: boolean
  dispositionElapsedMs: number | null  // time spent in Decision Made stage specifically
  dispositionDelayReason: DispositionDelayReason | null  // recorded reason if any
  dispositionDelayLogId: string | null  // ID of the active disposition_delay_reasons row
}

export interface BedStageLog {
  id: string
  bedId: string
  fromStageId: string | null
  toStageId: string
  changedByUserId: string
  transitionTime: Date
  durationInPreviousStageMs: number | null
  notes: string | null
  metadata: Record<string, unknown>
}

export interface BedGridData {
  beds: BedWithElapsedTime[]
  stages: Stage[]
  delayThresholdMs: number
  bottleneckCount: number  // US-1.6: count of active disposition bottlenecks
}

export interface OverrideState {
  bedId: string
  stageId: string
  bedNumber: string
  fromStageName: string | null
  toStage: Stage
  reason: string | null
}

export interface ConfirmationState {
  bedId: string
  stageId: string
  bedNumber: string
  fromStageName: string | null
  toStage: Stage
}

/**
 * State held while the DischargeModal is open (US-2.3)
 * Created when a nurse selects the "Discharge Process" stage on an occupied bed.
 */
export interface DischargeState {
  bedId: string
  bedNumber: string
  fromStageName: string | null
  /** Total elapsed ms for the current patient — displayed in the modal */
  elapsedTimeMs: number | null
  patientStartTime: Date | null
}
