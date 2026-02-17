// Stage Analytics Queries
// Purpose: Analyze stage transitions and time spent in each stage
// Epic: EPIC 3 - Time Tracking & Stage Logging

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'

/**
 * Stage transition record with calculated duration
 */
export interface StageTransitionRecord {
  id: string
  bedNumber: string
  bedId: string
  fromStageName: string | null
  toStageName: string
  transitionTime: Date
  durationInPreviousStageMs: number | null
  durationInCurrentStageMs: number | null
  changedByUsername: string
  notes: string | null
}

/**
 * Stage duration statistics
 */
export interface StageDurationStats {
  stageName: string
  stageId: string
  totalTransitions: number
  averageDurationMs: number
  minDurationMs: number | null
  maxDurationMs: number | null
  medianDurationMs: number | null
  p90DurationMs: number | null
  p95DurationMs: number | null
}

/**
 * Bed stage timeline
 */
export interface BedStageTimeline {
  bedNumber: string
  bedId: string
  totalTimeMs: number
  patientStartTime: Date | null
  patientEndTime: Date | null
  transitions: StageTransitionRecord[]
}

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
 * Get duration statistics for each stage
 * @param startDate - Filter from this date
 * @param endDate - Filter until this date
 */
export async function getStageDurationStats(
  startDate?: Date,
  endDate?: Date
): Promise<StageDurationStats[]> {
  try {
    let sql = `
      SELECT 
        s.name as "stageName",
        s.id as "stageId",
        COUNT(bsl.id) as "totalTransitions",
        AVG(bsl.duration_in_previous_stage_ms) as "averageDurationMs",
        MIN(bsl.duration_in_previous_stage_ms) as "minDurationMs",
        MAX(bsl.duration_in_previous_stage_ms) as "maxDurationMs",
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY bsl.duration_in_previous_stage_ms) as "medianDurationMs",
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY bsl.duration_in_previous_stage_ms) as "p90DurationMs",
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY bsl.duration_in_previous_stage_ms) as "p95DurationMs"
      FROM stages s
      LEFT JOIN bed_stage_logs bsl ON s.id = bsl.to_stage_id
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

    sql += `
      GROUP BY s.id, s.name
      ORDER BY s.display_order ASC
    `

    const result = await query<StageDurationStats>(sql, params)
    return result.rows
  } catch (error) {
    logger.error('Failed to fetch stage duration stats', error as Error)
    throw new Error('Failed to fetch stage duration statistics from database')
  }
}

/**
 * Get complete timeline for a specific bed
 * @param bedId - The bed ID to get timeline for
 */
export async function getBedStageTimeline(bedId: string): Promise<BedStageTimeline | null> {
  try {
    // Get basic bed info
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

/**
 * Get beds with longest wait times in current stage
 * @param limit - Number of results to return
 */
export async function getBedsSortedByCurrentWaitTime(limit: number = 10): Promise<
  Array<{
    bedNumber: string
    bedId: string
    currentStageName: string
    currentStageId: string
    waitTimeMs: number
    transitionTime: Date
  }>
> {
  try {
    const result = await query<{
      bedNumber: string
      bedId: string
      currentStageName: string
      currentStageId: string
      waitTimeMs: number
      transitionTime: Date
    }>(
      `
      SELECT 
        b.bed_number as "bedNumber",
        b.id as "bedId",
        s.name as "currentStageName",
        b.current_stage_id as "currentStageId",
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - 
          (SELECT MAX(transition_time) 
           FROM bed_stage_logs 
           WHERE bed_id = b.id)
        )) * 1000 as "waitTimeMs",
        (SELECT MAX(transition_time) FROM bed_stage_logs WHERE bed_id = b.id) as "transitionTime"
      FROM beds b
      LEFT JOIN stages s ON b.current_stage_id = s.id
      WHERE b.is_active = true AND b.is_occupied = true
      ORDER BY "waitTimeMs" DESC
      LIMIT $1
      `,
      [limit]
    )

    return result.rows
  } catch (error) {
    logger.error('Failed to fetch beds sorted by wait time', error as Error)
    throw new Error('Failed to fetch beds sorted by wait time from database')
  }
}

/**
 * Get summary statistics for all beds
 */
export async function getBedAnalyticsSummary(): Promise<{
  totalBedsUsed: number
  totalTransitions: number
  averageTimePerPatientMs: number
  averageTransitionsPerPatient: number
  totalPatientsProcessed: number
}> {
  try {
    const result = await query<{
      totalBedsUsed: number
      totalTransitions: number
      averageTimePerPatientMs: number
      averageTransitionsPerPatient: number
      totalPatientsProcessed: number
    }>(
      `
      SELECT 
        COUNT(DISTINCT b.id) as "totalBedsUsed",
        COUNT(DISTINCT bsl.id) as "totalTransitions",
        COALESCE(AVG(
          EXTRACT(EPOCH FROM 
            (SELECT MAX(transition_time) FROM bed_stage_logs bsl2 WHERE bsl2.bed_id = b.id) 
            - COALESCE(b.patient_start_time, CURRENT_TIMESTAMP)
          ) * 1000
        ), 0) as "averageTimePerPatientMs",
        COALESCE(AVG(
          (SELECT COUNT(*) FROM bed_stage_logs bsl2 WHERE bsl2.bed_id = b.id)::float
        ), 0) as "averageTransitionsPerPatient",
        COUNT(DISTINCT CASE WHEN b.patient_start_time IS NOT NULL THEN b.id END) as "totalPatientsProcessed"
      FROM beds b
      LEFT JOIN bed_stage_logs bsl ON b.id = bsl.bed_id
      WHERE b.is_active = true
      `
    )

    return result.rows[0] || {
      totalBedsUsed: 0,
      totalTransitions: 0,
      averageTimePerPatientMs: 0,
      averageTransitionsPerPatient: 0,
      totalPatientsProcessed: 0,
    }
  } catch (error) {
    logger.error('Failed to fetch bed analytics summary', error as Error)
    throw new Error('Failed to fetch bed analytics summary from database')
  }
}
