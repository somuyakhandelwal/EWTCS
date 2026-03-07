// AI Summary Types
// EPIC 9: Daily AI Summary Generator (US-9.1 – US-9.6)

export type SummaryStatus = 'draft' | 'approved' | 'rejected'

export interface DailySummary {
  id: string
  summaryDate: string       // 'YYYY-MM-DD'
  // US-9.1 aggregated stats
  totalPatients: number
  totalTransitions: number
  avgTatMs: number | null
  delayedTransitions: number
  delayRate: number         // 0-1
  bedsUsed: number
  // US-9.2 AI output
  aiText: string | null
  confidenceScore: number | null  // 0-100
  aiModel: string | null
  // US-9.3 / US-9.5 approval workflow
  status: SummaryStatus
  supervisorNotes: string | null
  reviewedText: string | null
  approvedBy: string | null       // username
  approvedAt: Date | null
  rejectedBy: string | null       // username
  rejectedAt: Date | null
  rejectionReason: string | null
  createdAt: Date
  updatedAt: Date
}

/** Aggregated daily stats passed to the AI prompt (US-9.1) */
export interface DailyStats {
  date: string
  totalPatients: number
  totalTransitions: number
  avgTatMs: number | null
  delayedTransitions: number
  delayRate: number
  bedsUsed: number
  topBottleneckStage: string | null
  busiestShift: string | null
}
