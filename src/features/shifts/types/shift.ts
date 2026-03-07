// Shift Types
// EPIC 8: Shift Management (US-8.1, US-8.2, US-8.3, US-8.4)

export interface Shift {
  id: string
  name: string
  /** "HH:MM:SS" 24-hour start time */
  startTime: string
  /** "HH:MM:SS" 24-hour end time — may be < startTime for overnight shifts */
  endTime: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

/** Aggregated performance metrics for a single shift over a date range */
export interface ShiftPerformance {
  shiftId: string
  shiftName: string
  startTime: string
  endTime: string
  /** Number of distinct stage transitions recorded */
  totalTransitions: number
  /** Distinct beds that had at least one update in this shift */
  bedsUsed: number
  /** Average time (ms) from patient_start_time to first Empty/Cleaning stage */
  averageTATMs: number | null
  /** Transitions where duration_in_previous_stage_ms exceeded the global threshold */
  delayedTransitions: number
  /** delayedTransitions / totalTransitions (0-1) */
  delayRate: number
}

/** Used inside the analytics/comparison tab */
export interface ShiftComparisonRow {
  shift: Shift
  performance: ShiftPerformance | null
}
