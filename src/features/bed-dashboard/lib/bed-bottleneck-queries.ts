// Disposition Bottleneck Query - Epic 1: Nurse Desk Bed Dashboard (US-1.6)
// Separated to keep bed-queries.ts under the 200-line file limit
import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { BedWithElapsedTime } from '../types/bed'


/** Bottleneck threshold: flag Decision Made beds after 30 minutes */
const DISPOSITION_BOTTLENECK_THRESHOLD_MS = 30 * 60 * 1000
const DEFAULT_DELAY_THRESHOLD_MINUTES = 180;

/**
 * Get all active beds with elapsed time, delay status, and
 * disposition bottleneck fields (US-1.6).
 */

/**
 * Get all active beds with elapsed time, delay status, and disposition bottleneck fields (US-1.6).
 * Uses per-stage delay thresholds from stage_delay_thresholds table.
 */
export async function getBedsWithElapsedTime(): Promise<BedWithElapsedTime[]> {
  try {
    const result = await query<BedWithElapsedTime>(
      `
      SELECT
        b.id,
        b.bed_number                          AS "bedNumber",
        b.current_stage_id                    AS "currentStageId",
        b.patient_start_time                  AS "patientStartTime",
        b.last_stage_change                   AS "lastStageChange",
        b.is_occupied                         AS "isOccupied",
        b.is_active                           AS "isActive",
        b.metadata,
        b.created_at                          AS "createdAt",
        b.updated_at                          AS "updatedAt",
        json_build_object(
          'id',           s.id,
          'name',         s.name,
          'displayOrder', s.display_order,
          'colorCode',    s.color_code,
          'description',  s.description,
          'isActive',     s.is_active
        )                                     AS "currentStage",
        -- Total time since patient was admitted
        CASE
          WHEN b.is_occupied AND b.patient_start_time IS NOT NULL
          THEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - b.patient_start_time)) * 1000
          ELSE NULL
        END                                   AS "elapsedTimeMs",
        -- Per-stage delay threshold (ms) or global default
        COALESCE(
          sdt.threshold_minutes * 60 * 1000,
          (SELECT value::numeric * 60 * 1000 FROM system_settings WHERE key = 'default_delay_threshold_minutes'),
          $1
        ) AS "delayThresholdMs",
        -- Flag overall delay (> threshold)
        CASE
          WHEN b.is_occupied AND b.patient_start_time IS NOT NULL
            AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - b.patient_start_time)) * 1000 > COALESCE(
              sdt.threshold_minutes * 60 * 1000,
              (SELECT value::numeric * 60 * 1000 FROM system_settings WHERE key = 'default_delay_threshold_minutes'),
              $1
            )
          THEN true
          ELSE false
        END                                   AS "isDelayed",
        -- US-1.6: Time spent in Decision Made stage (from last_stage_change)
        CASE
          WHEN b.is_occupied AND s.name = 'Decision Made'
            AND b.last_stage_change IS NOT NULL
          THEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - b.last_stage_change)) * 1000
          ELSE NULL
        END                                   AS "dispositionElapsedMs",
        -- US-1.6: Bottleneck flag (Decision Made > 30 min)
        CASE
          WHEN b.is_occupied AND s.name = 'Decision Made'
            AND b.last_stage_change IS NOT NULL
            AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - b.last_stage_change)) * 1000 > $2
          THEN true
          ELSE false
        END                                   AS "isDispositionBottleneck",
        -- US-1.6: Most recent unresolved delay reason
        ddr.reason                            AS "dispositionDelayReason",
        ddr.id                                AS "dispositionDelayLogId"
      FROM beds b
      LEFT JOIN stages s ON b.current_stage_id = s.id
      LEFT JOIN stage_delay_thresholds sdt ON s.id = sdt.stage_id
      LEFT JOIN LATERAL (
        SELECT id, reason
        FROM disposition_delay_reasons
        WHERE bed_id = b.id AND resolved_at IS NULL
        ORDER BY recorded_at DESC
        LIMIT 1
      ) ddr ON true
      WHERE b.is_active = true
      ORDER BY b.bed_number ASC
      `,
      [180 * 60 * 1000, DISPOSITION_BOTTLENECK_THRESHOLD_MS]
    )
    return result.rows
  } catch (error) {
    logger.error('Failed to fetch beds with elapsed time', error as Error)
    throw new Error('Failed to fetch beds from database')
  }
}
