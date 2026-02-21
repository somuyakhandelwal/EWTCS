// TypeScript types for EPIC 9: Daily AI Summary
// Covers the shape of aggregated daily data and database row formats.

/** Status of the daily summary in the review workflow (US-9.2) */
export type DailySummaryStatus = 'draft' | 'published' | 'rejected'

/** Single AI insight with confidence score (US-9.3) */
export interface AiInsight {
    id: string
    text: string
    confidence: number  // 0-100
    category?: 'trend' | 'bottleneck' | 'success' | 'volume' | 'metric'
    flagged?: boolean
}

/**
 * The full daily summary record stored in the daily_summaries table.
 */
export interface DailySummary {
    id: string
    summaryDate: string           // ISO date string: 'YYYY-MM-DD'
    totalPatients: number
    avgStageTimeMinutes: number
    delayCount: number
    avgTatMinutes: number
    totalBedsUsed: number
    totalStageUpdates: number
    generatedAt: string           // ISO timestamp
    aiSummary?: string            // Human-readable summary text (200-300 words)
    status: DailySummaryStatus
    reviewedBy?: string           // User ID who approved/rejected
    reviewedAt?: string           // ISO timestamp
    publishedAt?: string          // ISO timestamp
    aiInsights: AiInsight[]
    metadata: DailySummaryMetadata
}

/**
 * Flexible extra fields stored in the JSONB metadata column.
 * Extend this as more data points are needed by the AI layer.
 */
export interface DailySummaryMetadata {
    mostDelayedStage?: string     // Stage name with highest delay count
    summaryWordCount?: number     // Post-generation validation (US-9.1)
    meetsWordCountRequirement?: boolean  // true if 100-400 words (200-300 target)
}

/**
 * Raw aggregation result computed from the database before writing.
 * Mirrors DailySummary but without id/generatedAt (those are DB-assigned).
 */
export interface DailySummaryInput {
    summaryDate: string
    totalPatients: number
    avgStageTimeMinutes: number
    delayCount: number
    avgTatMinutes: number
    totalBedsUsed: number
    totalStageUpdates: number
    aiSummary?: string
    aiInsights?: AiInsight[]
    metadata: DailySummaryMetadata
}

/**
 * Result returned from a generate/aggregate operation.
 */
export interface AggregationResult {
    success: boolean
    date: string
    summary?: DailySummary
    error?: string
}
