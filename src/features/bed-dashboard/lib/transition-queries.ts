// Stage Transition Queries
// Purpose: Fetch and analyze stage transitions
// Epic: EPIC 3 - Time Tracking & Stage Logging

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { StageTransitionRecord, BedStageTimeline } from './stage-analytics'

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
      SELECT 
        bsl.id,
        b.bed_number as "bedNumber",
        b.id as "bedId",
        fs.name as "fromStageName",
        ts.name as "toStageName",
        bsl.transition_time as "transitionTime",
        bsl.duration_in_previous_stage_ms as "durationInPreviousStageMs",
        EXTRACT(EPOCH FROM (
          COALESCE(
            (SELECT MIN(bsl2.transition_time) 
             FROM bed_stage_logs bsl2 
             WHERE bsl2.bed_id = bsl.bed_id 
             AND bsl2.transition_time > bsl.transition_time
             LIMIT 1),
            CURRENT_TIMESTAMP
          ) - bsl.transition_time
        )) * 1000 as "durationInCurrentStageMs",
        u.username as "changedByUsername",
        bsl.notes
      FROM bed_stage_logs bsl
      JOIN beds b ON bsl.bed_id = b.id
      LEFT JOIN stages fs ON bsl.from_stage_id = fs.id
      JOIN stages ts ON bsl.to_stage_id = ts.id
      JOIN users u ON bsl.changed_by_user_id = u.id
      WHERE 1=1
    `

    const params: unknown[] = []

    if (startDate) {
      params.push(startDate)
      sql += ` AND bsl.transition_time >= $${params.length}`
    }

    if (endDate) {
      params.push(endDate)
      sql += ` AND bsl.transition_time <= $${params.length}`
    }

    if (bedId) {
      params.push(bedId)
      sql += ` AND bsl.bed_id = $${params.length}`
    }

    if (stageId) {
      params.push(stageId)
      sql += ` AND bsl.to_stage_id = $${params.length}`
    }

    sql += ` ORDER BY bsl.transition_time DESC`

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
