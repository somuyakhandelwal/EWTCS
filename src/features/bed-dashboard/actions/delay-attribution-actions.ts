'use server'
// Delay Attribution Analytics Action
// Epic 3: Time Tracking & Stage Logging (US-3.4)
// Separated from analytics-actions.ts to stay under the 200-line file limit.

import { requireRole } from '@/shared/lib/auth'
import { logger } from '@/shared/config/logger'
import { getDelaysByAttribution } from '../lib/delay-attribution-queries'
import { ATTRIBUTION_LABELS } from '../lib/delay-attribution-config'
import type { DelayAttributionStats } from '../lib/stage-analytics'

/**
 * Fetch delay totals grouped by attribution category (Emergency Staff / Hospital Capacity).
 * Supervisors, admins, and auditors may access this data.
 *
 * @param options.thresholdMs - minimum ms to count as a delay (default 1 h)
 * @param options.startDate   - optional date range lower bound
 * @param options.endDate     - optional date range upper bound
 */
export async function fetchDelayAttributionStats(options?: {
  thresholdMs?: number
  startDate?: Date
  endDate?: Date
}): Promise<{
  success: boolean
  data?: DelayAttributionStats[]
  error?: string
}> {
  try {
    const session = await requireRole(['supervisor', 'admin', 'auditor'])

    const rows = await getDelaysByAttribution(
      options?.thresholdMs,
      options?.startDate,
      options?.endDate
    )

    // Calculate total delayed ms across all categories for percentages
    const grandTotal = rows.reduce((sum, r) => sum + r.totalDelayedMs, 0)

    const data: DelayAttributionStats[] = rows.map((row) => ({
      attribution: row.attribution,
      label: ATTRIBUTION_LABELS[row.attribution],
      totalDelayedMs: row.totalDelayedMs,
      incidentCount: row.incidentCount,
      percentage: grandTotal > 0
        ? Math.round((row.totalDelayedMs / grandTotal) * 100)
        : 0,
    }))

    logger.info('Fetched delay attribution stats', {
      userId: session.userId,
      categories: data.map((d) => `${d.attribution}:${d.incidentCount}`).join(', '),
    })

    return { success: true, data }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch delay attribution stats'
    logger.error('Failed to fetch delay attribution stats', error as Error)
    return { success: false, error: message }
  }
}
