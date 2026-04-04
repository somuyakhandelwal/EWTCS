import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { Bed } from '../types/bed'
import {
  BED_SELECT_PROJECTION,
  CURRENT_STAGE_PROJECTION,
} from './bed-sql-constants'

/** Get all active beds with current stage information */
export async function getAllBeds(): Promise<Bed[]> {
  try {
    const result = await query<Bed>(`
      SELECT
        ${BED_SELECT_PROJECTION},
        ${CURRENT_STAGE_PROJECTION}
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

/** Get bed by ID */
export async function getBedById(bedId: string): Promise<Bed | null> {
  try {
    const result = await query<Bed>(
      `
      SELECT
        ${BED_SELECT_PROJECTION},
        ${CURRENT_STAGE_PROJECTION}
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

/** Get bed by bed number */
export async function getBedByNumber(bedNumber: string): Promise<Bed | null> {
  try {
    const result = await query<Bed>(
      `
      SELECT
        ${BED_SELECT_PROJECTION}
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