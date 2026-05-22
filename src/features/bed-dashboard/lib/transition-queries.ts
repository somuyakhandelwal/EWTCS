// Stage Transition Queries
// Purpose: Fetch and analyze stage transitions
// Epic: EPIC 3 - Time Tracking & Stage Logging

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { StageTransitionRecord, BedStageTimeline } from './stage-analytics'
import { STAGE_LOG_HISTORY_CTE } from './stage-log-history-source'

/**
 * Get all stage transitions with calculated durations
 * @param startDate - Filter transitions from this date
 * @param endDate - Filter transitions until this date
 * @param bedId - Optional: filter by specific bed
 * @param stageId - Optional: filter by specific stage
 */
export async function getStageTransitions(
  startDate?: Date,
  endDate?: Date,
  bedId?: string,
  stageId?: string
): Promise<StageTransitionRecord[]> {
  try {
    let sql = `
      ${STAGE_LOG_HISTORY_CTE},
      logs_with_duration AS (
        SELECT
          sl.id,
          sl.bed_id,
          sl.bed_number,
          sl.from_stage_id,
          sl.to_stage_id,
          sl.from_stage_name,
          sl.to_stage_name,
          sl.changed_by_user_id,
          sl.changed_by_username,
          sl.transition_time,
          sl.duration_in_previous_stage_ms,
          sl.notes,
          EXTRACT(EPOCH FROM (
            COALESCE(
              LEAD(sl.transition_time) OVER (
                PARTITION BY sl.bed_id ORDER BY sl.transition_time ASC
              ),
              CURRENT_TIMESTAMP
            ) - sl.transition_time
          )) * 1000 AS duration_in_current_stage_ms
        FROM stage_logs sl
      )
      SELECT
        l.id,
        l.bed_number AS "bedNumber",
        l.bed_id AS "bedId",
        l.from_stage_name AS "fromStageName",
        l.to_stage_name AS "toStageName",
        l.transition_time AS "transitionTime",
        l.duration_in_previous_stage_ms AS "durationInPreviousStageMs",
        l.duration_in_current_stage_ms AS "durationInCurrentStageMs",
        l.changed_by_user_id AS "changedByUserId",
        l.changed_by_username AS "changedByUsername",
        l.notes
      FROM logs_with_duration l
      JOIN beds b ON b.id = l.bed_id
      JOIN wards w ON w.id = b.ward_id AND w.code = 'ER'
      WHERE 1=1
    `

    const params: unknown[] = []

    if (startDate) {
      params.push(startDate)
      sql += ` AND l.transition_time >= $${params.length}`
    }

    if (endDate) {
      params.push(endDate)
      sql += ` AND l.transition_time <= $${params.length}`
    }

    if (bedId) {
      params.push(bedId)
      sql += ` AND l.bed_id = $${params.length}`
    }

    if (stageId) {
      params.push(stageId)
      sql += ` AND l.to_stage_id = $${params.length}`
    }

    sql += ` ORDER BY l.transition_time DESC, l.id DESC`

    const result = await query<StageTransitionRecord>(sql, params)
    return result.rows
  } catch (error) {
    logger.error('Failed to fetch stage transitions', error as Error)
    throw new Error('Failed to fetch stage transitions from database')
  }
}

/**
 * Get complete timeline for a specific bed
 * @param bedId - The bed ID to get timeline for
 */
export async function getBedStageTimeline(bedId: string): Promise<BedStageTimeline | null> {
  try {
    const bedResult = await query<{
      bedNumber: string
      bedId: string
      patientStartTime: Date | null
    }>(
      `
      SELECT 
        b.bed_number as "bedNumber",
        b.id as "bedId",
        b.patient_start_time as "patientStartTime"
      FROM beds b
      JOIN wards w ON w.id = b.ward_id AND w.code = 'ER'
      WHERE b.id = $1
      `,
      [bedId]
    )

    if (bedResult.rows.length === 0) {
      return null
    }

    const bed = bedResult.rows[0]

    // Get all transitions for this bed
    const transitions = await getStageTransitions(undefined, undefined, bedId)

    // Calculate total time
    const totalTimeMs = transitions.reduce((sum, t) => {
      return sum + (t.durationInPreviousStageMs || 0)
    }, 0)

    // Get patient end time (last transition)
    const patientEndTime = transitions.length > 0 ? transitions[0].transitionTime : null

    return {
      bedNumber: bed.bedNumber,
      bedId: bed.bedId,
      totalTimeMs,
      patientStartTime: bed.patientStartTime,
      patientEndTime,
      transitions: transitions.reverse(), // Most recent last
    }
  } catch (error) {
    logger.error('Failed to fetch bed stage timeline', error as Error)
    throw new Error('Failed to fetch bed stage timeline from database')
  }
}
