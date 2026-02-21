// Stage-Wise Delay Queries (US-10.5)
// Epic 10: Management Report Dashboard
//
// Wraps the existing getStageDurationStats (from bed-dashboard analytics)
// and adds bottleneck flagging logic suitable for the management report view.
//
// SERVER-ONLY – imports pg via @/shared/lib/db.
import 'server-only'

import { getStageDurationStats } from '@/features/bed-dashboard/lib/duration-stats-queries'
import type { StageDelayReport, StageDelayRow } from '../types/report.types'

// A stage is a bottleneck when its avg duration exceeds the overall mean by
// this multiplier AND it has at least MIN_TRANSITIONS transitions.
const BOTTLENECK_MULTIPLIER = 1.5
const MIN_TRANSITIONS = 3

/**
 * Returns stage-level delay statistics for the management report.
 * Stages are sorted by average duration descending (worst first).
 *
 * @param startDate  Optional date range lower bound on transition_time
 * @param endDate    Optional date range upper bound on transition_time
 */
export async function getStageDelayReport(
  startDate?: Date,
  endDate?: Date
): Promise<StageDelayReport> {
  const stats = await getStageDurationStats(startDate, endDate)

  // Compute overall mean across stages that have data
  const withData = stats.filter((s) => s.totalTransitions >= MIN_TRANSITIONS)
  const overallMeanMs =
    withData.length > 0
      ? withData.reduce((sum, s) => sum + s.averageDurationMs, 0) / withData.length
      : 0

  const rows: StageDelayRow[] = stats
    .map((s) => ({
      stageId: s.stageId,
      stageName: s.stageName,
      totalTransitions: s.totalTransitions,
      avgDurationMs: s.averageDurationMs,
      medianDurationMs: s.medianDurationMs,
      p90DurationMs: s.p90DurationMs,
      isBottleneck:
        s.totalTransitions >= MIN_TRANSITIONS &&
        overallMeanMs > 0 &&
        s.averageDurationMs > overallMeanMs * BOTTLENECK_MULTIPLIER,
    }))
    // Sort by avg duration DESC (longest delay first)
    .sort((a, b) => b.avgDurationMs - a.avgDurationMs)

  return {
    rows,
    overallMeanMs,
    rangeStart: startDate ?? null,
    rangeEnd: endDate ?? null,
  }
}
