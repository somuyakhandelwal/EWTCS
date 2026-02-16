// Stage Database Queries
// Epic 1: Nurse Desk Bed Dashboard

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { Stage } from '../types/bed'

/**
 * Get all active stages ordered by display_order
 */
export async function getAllStages(): Promise<Stage[]> {
  try {
    const result = await query<Stage>(`
      SELECT 
        id,
        name,
        display_order as "displayOrder",
        color_code as "colorCode",
        description,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM stages
      WHERE is_active = true
      ORDER BY display_order ASC
    `)
    
    return result.rows
  } catch (error) {
    logger.error('Failed to fetch stages', error as Error)
    throw new Error('Failed to fetch stages from database')
  }
}

/**
 * Get stage by ID
 */
export async function getStageById(stageId: string): Promise<Stage | null> {
  try {
    const result = await query<Stage>(
      `
      SELECT 
        id,
        name,
        display_order as "displayOrder",
        color_code as "colorCode",
        description,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM stages
      WHERE id = $1 AND is_active = true
      LIMIT 1
      `,
      [stageId]
    )
    
    return result.rows[0] || null
  } catch (error) {
    logger.error('Failed to fetch stage', error as Error, { stageId })
    throw new Error('Failed to fetch stage from database')
  }
}
