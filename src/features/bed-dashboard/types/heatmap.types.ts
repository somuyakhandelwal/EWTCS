// Staffing Heatmap Types
// EPIC 10: Management Report Dashboard
// US-10.x: Staffing heatmap — patient volume by hour of day and day of week

/** One data point in the 7×24 heatmap grid */
export interface HeatmapCell {
  /** 0 = Sunday … 6 = Saturday (matches EXTRACT(DOW) in PostgreSQL) */
  dayOfWeek: number
  /** 0 … 23 */
  hourOfDay: number
  /** Number of patient admissions that started in this slot */
  count: number
}

/** Full heatmap dataset returned by the server action */
export interface HeatmapData {
  cells: HeatmapCell[]
  /** Highest count across all cells — used to calculate colour intensity */
  maxCount: number
  /** Sum of all cell counts */
  totalAdmissions: number
  dateRange: {
    start: Date | null
    end: Date | null
  }
}

/** One admission record shown in the drill-down modal */
export interface HeatmapDrillDownRecord {
  admissionId: string
  bedNumber: string
  admittedAt: Date
  dischargedAt: Date
  totalDurationMs: number
  dischargedBy: string
}

/** Optional filter params forwarded to the server actions */
export interface HeatmapFilters {
  startDate?: Date
  endDate?: Date
}
