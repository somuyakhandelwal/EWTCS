// Management Report Types (US-10.1)
// Epic 10: Management Report Dashboard

export type DateRangePreset = '24h' | '7d' | '30d' | 'custom'

export interface DateRange {
  startDate: Date
  endDate: Date
}

/**
 * Aggregate patient count summary for a given date range,
 * optionally scoped to a single shift.
 */
export interface PatientCountSummary {
  /** Total discharged patients in the period */
  totalPatients: number
  /** Average stay duration across all patients (ms) */
  avgDurationMs: number | null
  /** Date/time range actually queried */
  rangeStart: Date
  rangeEnd: Date
  /** Shift name if filtered, null = all shifts */
  shiftName: string | null
}

/**
 * Per-shift aggregate row used by US-8.3 / US-8.4.
 */
export interface ShiftPerformanceRow {
  shiftId: string
  shiftName: string
  startTime: string
  endTime: string
  crossesMidnight: boolean
  patientsTreated: number
  avgTatMs: number | null
  /** Stage transitions that exceeded the 3-hour delay threshold */
  delayCount: number
}

/** Full comparison result containing all active shifts for a date range. */
export interface ShiftComparisonReport {
  rows: ShiftPerformanceRow[]
  rangeStart: Date
  rangeEnd: Date
  /** shiftId of the best-performing shift (most patients + fewest delays) */
  bestShiftId: string | null
  /** shiftId of the worst-performing shift */
  worstShiftId: string | null
}

// ---------------------------------------------------------------------------
// Sign-Off Types (EPIC 12: Audit & Compliance)
// ---------------------------------------------------------------------------

/** Status of a single sign-off record (approved = active, superseded = replaced). */
export type SignOffStatus = 'approved' | 'superseded'

/**
 * A supervisor sign-off record for a daily report.
 * Maps 1:1 to a row in the `report_signoffs` table.
 * Sign-offs are immutable — the `superseded_by` field links to newer records.
 */
export interface ReportSignOff {
  id: string
  /** ISO date string YYYY-MM-DD of the report being signed off */
  reportDate: string
  /** Report category, e.g. 'daily' */
  reportType: string
  status: SignOffStatus
  signedOffBy: string
  signedOffByUsername: string | null
  signedOffAt: Date
  notes: string | null
  /** ID of the sign-off that superseded this record (null if still active) */
  supersededBy: string | null
  createdAt: Date
}

/** Standard result envelope for sign-off server actions. */
export interface SignOffResult {
  success: boolean
  data?: ReportSignOff
  error?: string
}
