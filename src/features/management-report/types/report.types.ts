// Management Report Types (US-10.1, US-10.3, US-10.4, US-10.5)
// Epic 10: Management Report Dashboard

// Re-exports shared report types — keeps the original path working
export * from '@/shared/types/report.types'

// ---------------------------------------------------------------------------
// US-10.3 — Percentage of Delayed Patients
// ---------------------------------------------------------------------------

/** One data point in the delay % trend (one day). */
export interface DelayTrendPoint {
  /** ISO date string YYYY-MM-DD */
  date: string
  totalPatients: number
  delayedPatients: number
  delayPct: number
}

export interface DelayedPatientsSummary {
  totalPatients: number
  delayedPatients: number
  /** 0-100 rounded to 1 dp */
  delayPct: number
  /** Configured target % — null if not set */
  targetPct: number | null
  /** Threshold used to classify a patient as delayed (ms) */
  thresholdMs: number
  rangeStart: Date
  rangeEnd: Date
  trend: DelayTrendPoint[]
}

// ---------------------------------------------------------------------------
// US-10.4 — Bed-Wise Performance
// ---------------------------------------------------------------------------

export interface BedPerformanceRow {
  bedId: string
  bedNumber: string
  patientsTreated: number
  avgDurationMs: number | null
  minDurationMs: number | null
  maxDurationMs: number | null
  /** Patients whose total stay exceeded the threshold */
  delayedCount: number
  /** 0-100 */
  delayRate: number
  /** true when this bed is flagged as an outlier */
  isOutlier: boolean
}

export interface BedPerformanceReport {
  rows: BedPerformanceRow[]
  /** Overall avg duration across all beds — used for outlier calculation */
  overallAvgMs: number | null
  /** 3-hour threshold used for delay classification (ms) */
  thresholdMs: number
  rangeStart: Date
  rangeEnd: Date
}

// ---------------------------------------------------------------------------
// US-10.5 — Stage-Wise Delays
// ---------------------------------------------------------------------------

export interface StageDelayRow {
  stageId: string
  stageName: string
  totalTransitions: number
  avgDurationMs: number
  medianDurationMs: number | null
  p90DurationMs: number | null
  /** true when this stage is flagged as the main bottleneck */
  isBottleneck: boolean
}

export interface StageDelayReport {
  rows: StageDelayRow[]
  /** Overall mean across all stages — used to flag bottlenecks */
  overallMeanMs: number
  rangeStart: Date | null
  rangeEnd: Date | null
}
