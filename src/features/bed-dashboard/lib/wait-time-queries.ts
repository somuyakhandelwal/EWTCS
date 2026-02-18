// Bed Wait Time Queries
// Purpose: Analyze waiting times and analytic summaries
// Epic: EPIC 3 - Time Tracking & Stage Logging

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'

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
