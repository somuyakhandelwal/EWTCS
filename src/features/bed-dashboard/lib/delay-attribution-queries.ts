// Delay Attribution Queries
// Epic 3: Time Tracking & Stage Logging
// Purpose: Aggregate delayed stage durations and tag each with an attribution

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import {
  getAttributionForDelay,
  ATTRIBUTION_CONFIG,
  type DelayAttribution,
} from './delay-attribution-config'
import type { DispositionDelayReason } from '../types/bed'

/** Minimum duration (ms) for a stage stay to be considered a delay */
const DEFAULT_DELAY_THRESHOLD_MS = 3_600_000 // 1 hour

export interface DelayAttributionRow {
  attribution: DelayAttribution
  totalDelayedMs: number
  incidentCount: number
}

// pg returns INTEGER and BIGINT as strings — raw row before coercion
interface RawDelayRow {
  stageDisplayOrder: string
  durationMs: string
  reason: DispositionDelayReason | null
}

/**
 * Fetch all completed stage stays that exceeded the delay threshold,
 * then bucket them into attribution categories using the config.
 *
 * Uses bed_stage_logs (existing table — no migration needed).
 *
 * @param thresholdMs - minimum duration to count as a delay (default 1 h)
 * @param startDate - optional lower bound for transition_time
 * @param endDate - optional upper bound for transition_time
 */
export async function getDelaysByAttribution(
  thresholdMs: number = DEFAULT_DELAY_THRESHOLD_MS,
  startDate?: Date,
  endDate?: Date
): Promise<DelayAttributionRow[]> {
  try {
    const params: unknown[] = [thresholdMs]
    let dateFilter = ''

    if (startDate) {
      params.push(startDate)
      dateFilter += ` AND bsl.transition_time >= $${params.length}`
    }
    if (endDate) {
      params.push(endDate)
      dateFilter += ` AND bsl.transition_time <= $${params.length}`
    }

    // Fetch every completed stage stay that exceeded the threshold.
    // We join disposition_delay_reasons (LEFT JOIN LATERAL) so Stage-5 rows carry
    // the nurse-recorded reason. We match by bed_stage_log_id when available,
    // otherwise fall back to bed_id — and we do NOT filter by resolved_at because
    // historical (already-resolved) reasons must also count for reports.
    const result = await query<RawDelayRow>(
      `
      SELECT
        s.display_order                       AS "stageDisplayOrder",
        bsl.duration_in_previous_stage_ms     AS "durationMs",
        ddr.reason                            AS "reason"
      FROM bed_stage_logs bsl
      JOIN stages s
        ON bsl.from_stage_id = s.id
      LEFT JOIN LATERAL (
        SELECT reason
        FROM disposition_delay_reasons
        WHERE (bed_stage_log_id = bsl.id OR bed_id = bsl.bed_id)
        ORDER BY recorded_at DESC
        LIMIT 1
      ) ddr ON true
      WHERE bsl.duration_in_previous_stage_ms IS NOT NULL
        AND bsl.duration_in_previous_stage_ms > $1
        ${dateFilter}
      ORDER BY bsl.transition_time DESC
      `,
      params
    )

    // Aggregate in-process (avoids a complex GROUP BY in SQL while keeping
    // the attribution logic in one place — the config file).
    // Coerce pg string results to numbers before arithmetic.
    const totals = new Map<
      DelayAttribution,
      { totalDelayedMs: number; incidentCount: number }
    >()

    for (const row of result.rows) {
      const stageOrder = parseInt(row.stageDisplayOrder, 10)
      const durationMs = parseFloat(row.durationMs)
      const attr = getAttributionForDelay(
        stageOrder,
        row.reason,
        ATTRIBUTION_CONFIG
      )
      const existing = totals.get(attr) ?? { totalDelayedMs: 0, incidentCount: 0 }
      totals.set(attr, {
        totalDelayedMs: existing.totalDelayedMs + durationMs,
        incidentCount: existing.incidentCount + 1,
      })
    }

    // Return all three categories (even zeroes) for consistent UI rendering
    const attributions: DelayAttribution[] = [
      'emergency_staff',
      'hospital_capacity',
      'unattributed',
    ]
    return attributions.map((attr) => ({
      attribution: attr,
      totalDelayedMs: totals.get(attr)?.totalDelayedMs ?? 0,
      incidentCount: totals.get(attr)?.incidentCount ?? 0,
    }))
  } catch (error) {
    logger.error('Failed to fetch delays by attribution', error as Error)
    throw new Error('Failed to fetch delay attribution data from database')
  }
}
