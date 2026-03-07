// Management Report Types
// EPIC 10: Management Report Dashboard (US-10.1 through US-10.7)

/** Top-level KPI summary for a date range */
export interface ReportMetrics {
  totalPatients: number        // US-10.1
  avgTatMs: number | null      // US-10.2
  delayedCount: number         // US-10.3
  delayRate: number            // 0-1 (US-10.3)
  targetDelayRate: number      // configured target
}

/** Daily data point for trend chart (US-10.7) */
export interface DailyTrend {
  date: string          // 'YYYY-MM-DD'
  patientCount: number
  avgTatMs: number | null
  delayedCount: number
}

/** Per-bed metrics for the performance table (US-10.4) */
export interface BedPerformance {
  bedId: string
  bedNumber: string
  patientCount: number
  avgTatMs: number | null
  delayedCount: number
  delayRate: number
}

/** Per-stage average duration for the bottleneck chart (US-10.5) */
export interface StageDelay {
  stageId: string
  stageName: string
  avgDurationMs: number
  transitionCount: number
  isBottleneck: boolean    // top 1 stage
}

/** One cell of the activity heatmap (US-10.6): day 0=Sun…6=Sat, hour 0-23 */
export interface HeatmapCell {
  dow: number    // 0 = Sunday … 6 = Saturday
  hour: number   // 0-23 UTC
  count: number
}

/** Full report payload returned by the server action */
export interface ReportData {
  metrics: ReportMetrics
  trend: DailyTrend[]
  bedPerformance: BedPerformance[]
  stageDelays: StageDelay[]
  heatmap: HeatmapCell[]
}
