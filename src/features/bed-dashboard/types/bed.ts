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
  /** Ward this bed belongs to. Populated by the dashboard query; undefined on lightweight lookups. */
  wardId?: string | null
  currentStageId: string | null
  currentStage: Stage | null
  patientStartTime: Date | null
  lastStageChange: Date | null
  isOccupied: boolean
  isActive: boolean
  isTemporary: boolean  // US-6.5: present on all bed rows — false for permanent beds
  isVirtual: boolean    // US-6.6: true for nurse-created hallway/stretcher patients
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface BedWithElapsedTime extends Bed {
  elapsedTimeMs: number | null
  isDelayed: boolean
  isEscalated: boolean               // US-15.3: True if elapsed time > escalation threshold
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

/**
 * Pre-computed stage transition map, keyed by fromStageId (or 'null' for empty beds).
 * Bundled into BedGridData so offline nurses can see valid stage options without a server call.
 * Already role-scoped: fetched on behalf of the authenticated user during getBedGridData().
 */
export type StageTransitionMap = Record<string, { allowed: string[]; requiresOverride: string[] }>

export interface BedGridData {
  beds: BedWithElapsedTime[]
  stages: Stage[]
  delayThresholdMs: number
  escalationThresholdMs: number    // US-15.3: threshold above which beds are critically escalated
  bottleneckCount: number  // US-1.6: count of active disposition bottlenecks
  escalationCount: number  // US-15.3: count of escalated beds
  /** US-16.2: Role-scoped transition rules for offline context menu — optional for backwards compat */
  stageTransitionMap?: StageTransitionMap
  /**
   * The authenticated user's assigned ward ID.
   * Set for nurses (and housekeeping) that have a ward assignment; undefined for
   * admins / supervisors (cross-ward access) and floater nurses (no ward assigned).
   * Used by the offline layer to block writes to beds outside the user's ward.
   */
  userWardId?: string | null
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

// Turnaround Time (TAT) tracking types (US-2.4)

export interface TatRecord {
  bedId: string
  bedNumber: string
  dischargeStartTime: Date
  cleaningStartTime: Date | null
  cleaningEndTime: Date | null
  tatMs: number
  cleaningDurationMs: number | null
}

export interface TatSummary {
  averageTatMs: number
  medianTatMs: number | null
  maxTatMs: number | null
  minTatMs: number | null
  totalCompleted: number
  averageCleaningMs: number | null
}

// Full-Cycle TAT types (US-3.4: Discharge → Next Admission)

export interface FullCycleTatRecord {
  bedId: string
  bedNumber: string
  previousDischargedAt: Date
  admittedAt: Date
  tatMs: number
}

export interface FullCycleTatSummary {
  totalCycles: number
  averageTatMs: number
  medianTatMs: number | null
  minTatMs: number | null
  maxTatMs: number | null
  p90TatMs: number | null
}
