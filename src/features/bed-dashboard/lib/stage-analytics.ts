// Stage Analytics - Type Definitions and Query Exports
// Purpose: Central exports for analytics types and queries
// Epic: EPIC 3 - Time Tracking & Stage Logging

/**
 * Stage transition record with calculated duration
 */
export interface StageTransitionRecord {
  id: string
  bedNumber: string
  bedId: string
  fromStageName: string | null
  toStageName: string
  transitionTime: Date
  durationInPreviousStageMs: number | null
  durationInCurrentStageMs: number | null
  changedByUsername: string
  notes: string | null
}

/**
 * Stage duration statistics
 */
export interface StageDurationStats {
  stageName: string
  stageId: string
  totalTransitions: number
  averageDurationMs: number
  minDurationMs: number | null
  maxDurationMs: number | null
  medianDurationMs: number | null
  p90DurationMs: number | null
  p95DurationMs: number | null
}

/**
 * Bed stage timeline
 */
export interface BedStageTimeline {
  bedNumber: string
  bedId: string
  totalTimeMs: number
  patientStartTime: Date | null
  patientEndTime: Date | null
  transitions: StageTransitionRecord[]
}

// Re-export query functions from separate modules
export { getStageTransitions, getBedStageTimeline } from './transition-queries'
export { getStageDurationStats } from './duration-stats-queries'
export { getBedsSortedByCurrentWaitTime, getBedAnalyticsSummary } from './wait-time-queries'

