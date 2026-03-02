// Bed Database Queries - Epic 1: Nurse Desk Bed Dashboard
import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { Bed } from '../types/bed'

// US-1.6: getBedsWithElapsedTime lives in bed-bottleneck-queries.ts (200-line limit)
export { getBedsWithElapsedTime } from './bed-bottleneck-queries'

/** Get all active beds with current stage information */
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
        b.is_temporary as "isTemporary",
        b.is_virtual as "isVirtual",
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

/** Get bed by ID */
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
        b.is_temporary as "isTemporary",
        b.is_virtual as "isVirtual",
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
        b.is_temporary as "isTemporary",
        b.is_virtual as "isVirtual",
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

/** Get the ward ID and flags for a specific bed (for access control) */
export async function getBedAccessInfo(bedId: string): Promise<{ ward_id: string | null; is_virtual: boolean; is_temporary: boolean } | null> {
  try {
    const result = await query<{ ward_id: string | null; is_virtual: boolean; is_temporary: boolean }>(
      `
      SELECT b.ward_id, b.is_virtual, b.is_temporary
      FROM beds b
      WHERE b.id = $1
      LIMIT 1
      `,
      [bedId]
    )
    return result.rows[0] || null
  } catch (error) {
    logger.error('Failed to fetch bed access info', error as Error, { bedId })
    throw new Error('Failed to verify bed access')
  }
}

/** Get the ward ID for a specific bed (compatibility wrapper) */
export async function getBedWard(bedId: string): Promise<string | null> {
  const info = await getBedAccessInfo(bedId)
  return info?.ward_id || null
}

/** Get the ward ID for a specific user (for access control) */
export async function getUserWard(userId: string): Promise<string | null> {
  try {
    const result = await query<{ ward_id: string | null }>(
      `
      SELECT u.ward_id
      FROM users u
      WHERE u.id = $1
      LIMIT 1
      `,
      [userId]
    )

    return result.rows[0]?.ward_id || null
  } catch (error) {
    logger.error('Failed to fetch user ward', error as Error, { userId })
    throw new Error('Failed to verify access permissions')
  }
}

/**
 * Verify ward-level access for a user/bed pair.
 * Returns null when access is granted, or an error string to return to the client.
 * Extracted here to keep action files under 200 lines.
 */
export async function checkWardAccess(
  userId: string,
  bedId: string,
  role: string
): Promise<string | null> {
  const [userWard, bedInfo] = await Promise.all([
    getUserWard(userId),
    getBedAccessInfo(bedId)
  ])

  if (!bedInfo) return 'Bed not found.'

  // ADMINS skip all ward checks
  if (role === 'admin') return null

  // EPIC 6: US-6.2 / US-6.6: Virtual and Temporary (surge) beds can be updated by ANY qualified role
  // regardless of ward assignment. This avoids clinical bottlenecks during surge periods.
  if (bedInfo.is_virtual || bedInfo.is_temporary) return null

  // EPIC 15: If nurse has NO ward assigned, treat as a "Floater" with access to all wards
  if (!userWard) return null

  if (userWard && !bedInfo.ward_id)
    return 'This bed does not belong to any ward. Contact your administrator.'

  const allowed = userWard === bedInfo.ward_id

  return allowed ? null : 'You do not have permission to update this bed. Access is restricted to your assigned ward.'
}
