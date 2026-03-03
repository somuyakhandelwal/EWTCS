// Disposition Bottleneck Query - Epic 1: Nurse Desk Bed Dashboard (US-1.6)
// Separated to keep bed-queries.ts under the 200-line file limit
import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { BedWithElapsedTime } from '../types/bed'

/** Bottleneck threshold: flag Decision Made beds after 30 minutes */
const DISPOSITION_BOTTLENECK_THRESHOLD_MS = 30 * 60 * 1000

/**
 * Get all active beds with elapsed time, delay status, and
 * disposition bottleneck fields (US-1.6).
 * Updated (US-15.3) to compute escalation status.
 */
export async function getBedsWithElapsedTime(
  delayThresholdMs: number,
  escalationThresholdMs: number
): Promise<BedWithElapsedTime[]> {
  try {
    const result = await query<BedWithElapsedTime>(
      `
      WITH bed_timings AS (
        SELECT 
          b.*,
          s.name AS stage_name,
          COALESCE(sdt.threshold_minutes * 60000.0, $1) AS effective_threshold_ms,
          CASE 
            WHEN b.is_occupied AND b.patient_start_time IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - b.patient_start_time)) * 1000 
            ELSE NULL 
          END AS computed_elapsed_ms,
          CASE 
            WHEN b.is_occupied AND b.last_stage_change IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - b.last_stage_change)) * 1000 
            ELSE NULL 
          END AS computed_stage_elapsed_ms
        FROM beds b
        LEFT JOIN stages s ON b.current_stage_id = s.id
        LEFT JOIN stage_delay_thresholds sdt ON sdt.stage_id = b.current_stage_id
        WHERE b.is_active = true
      )
      SELECT
        bt.id,
        bt.ward_id AS "wardId",
        bt.bed_number AS "bedNumber",
        bt.current_stage_id AS "currentStageId",
        bt.patient_start_time AS "patientStartTime",
        bt.last_stage_change AS "lastStageChange",
        bt.is_occupied AS "isOccupied",
        bt.is_active AS "isActive",
        bt.is_temporary AS "isTemporary",
        bt.is_virtual AS "isVirtual",
        bt.metadata,
        bt.created_at AS "createdAt",
        bt.updated_at AS "updatedAt",
        json_build_object(
          'id',           s.id,
          'name',         s.name,
          'displayOrder', s.display_order,
          'colorCode',    s.color_code,
          'description',  s.description,
          'isActive',     s.is_active
        ) AS "currentStage",
        bt.computed_elapsed_ms AS "elapsedTimeMs",
        COALESCE(bt.computed_elapsed_ms > bt.effective_threshold_ms, false) AS "isDelayed",
        COALESCE(bt.computed_elapsed_ms > $2, false) AS "isEscalated",
        CASE WHEN bt.stage_name = 'Decision Made' THEN bt.computed_stage_elapsed_ms ELSE NULL END AS "dispositionElapsedMs",
        COALESCE(bt.stage_name = 'Decision Made' AND bt.computed_stage_elapsed_ms > $3, false) AS "isDispositionBottleneck",
        ddr.reason AS "dispositionDelayReason",
        ddr.id AS "dispositionDelayLogId"
      FROM bed_timings bt
      JOIN stages s ON bt.current_stage_id = s.id
      LEFT JOIN LATERAL (
        SELECT id, reason
        FROM disposition_delay_reasons
        WHERE bed_id = bt.id AND resolved_at IS NULL
        ORDER BY recorded_at DESC
        LIMIT 1
      ) ddr ON true
      ORDER BY bt.bed_number ASC
      `,
      [delayThresholdMs, escalationThresholdMs, DISPOSITION_BOTTLENECK_THRESHOLD_MS]
    )
    return result.rows
  } catch (error) {
    logger.error('Failed to fetch beds with elapsed time', error as Error)
    throw new Error('Failed to fetch beds from database')
  }
}
