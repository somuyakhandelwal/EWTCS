// Bed Database Queries
// Epic 1: Nurse Desk Bed Dashboard

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { Bed, BedWithElapsedTime } from '../types/bed'

/**
 * Get all active beds with current stage information
 */
export async function getAllBeds(): Promise<Bed[]> {
  try {
    const result = await query<Bed>(`
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
        b.updated_at as "updatedAt",
        json_build_object(
          'id', s.id,
          'name', s.name,
          'displayOrder', s.display_order,
          'colorCode', s.color_code,
          'description', s.description,
          'isActive', s.is_active
        ) as "currentStage"
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
        b.id,
        b.bed_number as "bedNumber",
        b.current_stage_id as "currentStageId",
        b.patient_start_time as "patientStartTime",
        b.last_stage_change as "lastStageChange",
        b.is_occupied as "isOccupied",
        b.is_active as "isActive",
        b.metadata,
        b.created_at as "createdAt",
        b.updated_at as "updatedAt",
        json_build_object(
          'id', s.id,
          'name', s.name,
          'displayOrder', s.display_order,
          'colorCode', s.color_code,
          'description', s.description,
          'isActive', s.is_active
        ) as "currentStage",
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
        b.id,
        b.bed_number as "bedNumber",
        b.current_stage_id as "currentStageId",
        b.patient_start_time as "patientStartTime",
        b.last_stage_change as "lastStageChange",
        b.is_occupied as "isOccupied",
        b.is_active as "isActive",
        b.metadata,
        b.created_at as "createdAt",
        b.updated_at as "updatedAt",
        json_build_object(
          'id', s.id,
          'name', s.name,
          'displayOrder', s.display_order,
          'colorCode', s.color_code,
          'description', s.description,
          'isActive', s.is_active
        ) as "currentStage"
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
