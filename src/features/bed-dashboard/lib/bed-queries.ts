// Bed Database Queries
// Epic 1: Nurse Desk Bed Dashboard

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import { BED_WITH_STAGE_SELECT } from './bed-query-helpers'
import type { Bed, BedWithElapsedTime } from '../types/bed'

/**
 * Get all active beds with current stage information
 */
export async function getAllBeds(): Promise<Bed[]> {
  try {
    const result = await query<Bed>(`
      SELECT 
        ${BED_WITH_STAGE_SELECT}
      FROM beds b
      LEFT JOIN stages s ON b.current_stage_id = s.id
      WHERE b.is_active = true
      ORDER BY b.bed_number ASC
    `)

    return result.rows
  } catch (error) {
    logger.error('Failed to fetch beds', error as Error)
    throw new Error('Failed to fetch beds from database')
  }
}

/**
 * Get all beds with elapsed time calculation
 */
export async function getBedsWithElapsedTime(delayThresholdMs: number): Promise<BedWithElapsedTime[]> {
  try {
    const result = await query<BedWithElapsedTime>(`
      SELECT 
        ${BED_WITH_STAGE_SELECT},
        CASE 
          WHEN b.is_occupied AND b.patient_start_time IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - b.patient_start_time)) * 1000
          ELSE NULL
        END as "elapsedTimeMs",
        CASE 
          WHEN b.is_occupied AND b.patient_start_time IS NOT NULL 
            AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - b.patient_start_time)) * 1000 > $1
          THEN true
          ELSE false
        END as "isDelayed"
      FROM beds b
      LEFT JOIN stages s ON b.current_stage_id = s.id
      WHERE b.is_active = true
      ORDER BY b.bed_number ASC
    `, [delayThresholdMs])

    return result.rows
  } catch (error) {
    logger.error('Failed to fetch beds with elapsed time', error as Error)
    throw new Error('Failed to fetch beds from database')
  }
}

/**
 * Get bed by ID
 */
export async function getBedById(bedId: string): Promise<Bed | null> {
  try {
    const result = await query<Bed>(
      `
      SELECT 
        ${BED_WITH_STAGE_SELECT}
      FROM beds b
      LEFT JOIN stages s ON b.current_stage_id = s.id
      WHERE b.id = $1 AND b.is_active = true
      LIMIT 1
      `,
      [bedId]
    )

    return result.rows[0] || null
  } catch (error) {
    logger.error('Failed to fetch bed', error as Error, { bedId })
    throw new Error('Failed to fetch bed from database')
  }
}

/**
 * Get bed by bed number
 */
export async function getBedByNumber(bedNumber: string): Promise<Bed | null> {
  try {
    const result = await query<Bed>(
      `
      SELECT 
        b.id,
        b.bed_number as "bedNumber",
        b.current_stage_id as "currentStageId",
        b.patient_start_time as "patientStartTime",
        b.last_stage_change as "lastStageChange",
        b.is_occupied as "isOccupied",
        b.is_active as "isActive",
        b.metadata,
        b.created_at as "createdAt",
        b.updated_at as "updatedAt"
      FROM beds b
      WHERE b.bed_number = $1 AND b.is_active = true
      LIMIT 1
      `,
      [bedNumber]
    )

    return result.rows[0] || null
  } catch (error) {
    logger.error('Failed to fetch bed by number', error as Error, { bedNumber })
    throw new Error('Failed to fetch bed from database')
  }
}

/**
 * Get stage transitions for a specific bed and current patient (US-3.2, US-3.6)
 */
export async function getBedStageHistory(bedId: string) {
  try {
    const currentBed = await getBedById(bedId)

    if (!currentBed || !currentBed.patientStartTime) {
      return []
    }

    const result = await query<any>(
      `
      SELECT 
        btl.id,
        s_from.name as "fromStageName",
        s_to.name as "toStageName",
        u.name as "changedByName",
        btl.transition_time as "transitionTime",
        btl.duration_in_previous_stage_ms as "durationMs",
        btl.notes
      FROM bed_stage_logs btl
      JOIN stages s_to ON btl.to_stage_id = s_to.id
      LEFT JOIN stages s_from ON btl.from_stage_id = s_from.id
      JOIN users u ON btl.changed_by_user_id = u.id
      WHERE btl.bed_id = $1 AND btl.transition_time >= $2
      ORDER BY btl.transition_time ASC
      `,
      [bedId, currentBed.patientStartTime]
    )

    return result.rows
  } catch (error) {
    logger.error('Failed to fetch bed stage history', error as Error, { bedId })
    throw new Error('Failed to fetch bed stage history from database')
  }
}
