// LoS Types — shared interfaces for EPIC 10 Length-of-Stay feature
// US-10.x: Average Time Patients Spend in Emergency Ward

export interface LosSummary {
  totalPatients: number
  averageLosMs: number
  medianLosMs: number | null
  minLosMs: number | null
  maxLosMs: number | null
  p75LosMs: number | null
  p90LosMs: number | null
  /** Configured target in ms — null if not set */
  targetLosMs: number | null
}

export interface LosTrendPoint {
  /** ISO date string: YYYY-MM-DD */
  date: string
  averageLosMs: number
  patientCount: number
}

export interface LosFilters {
  startDate?: Date
  endDate?: Date
  /** Shift time range: filter discharges within this HH:MM:SS window */
  shiftStartTime?: string
  shiftEndTime?: string
  shiftCrossesMidnight?: boolean
}

// Raw pg rows before numeric coercion (internal use only)
export interface RawLosSummaryRow {
  totalPatients: string
  averageLosMs: string | null
  medianLosMs: string | null
  minLosMs: string | null
  maxLosMs: string | null
  p75LosMs: string | null
  p90LosMs: string | null
}

export interface RawLosTrendRow {
  date: string
  averageLosMs: string | null
  patientCount: string
}
