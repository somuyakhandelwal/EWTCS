import { query } from '@/shared/lib/db'
import type { BedManagementData } from '../types/bed-management.types'

/**
 * Get all beds with ward and stage information
 * @param includeInactive - Whether to include deactivated beds
 * @returns Array of bed management data
 */
export async function getAllBedsForManagement(
    includeInactive: boolean = false
): Promise<BedManagementData[]> {
    const sql = `
        SELECT 
            b.id,
            b.bed_number as "bedNumber",
            b.ward_id as "wardId",
            w.name as "wardName",
            b.current_stage_id as "currentStageId",
            s.name as "currentStageName",
            b.is_occupied as "isOccupied",
            b.is_active as "isActive",
            b.metadata->>'location' as location,
            b.metadata,
            b.patient_start_time as "patientStartTime",
            b.created_at as "createdAt",
            b.updated_at as "updatedAt"
        FROM beds b
        LEFT JOIN wards w ON b.ward_id = w.id
        LEFT JOIN stages s ON b.current_stage_id = s.id
        ${includeInactive ? '' : 'WHERE b.is_active = true'}
        ORDER BY b.bed_number ASC
    `

    const result = await query(sql)
    return result.rows as BedManagementData[]
}

/**
 * Get a single bed by ID with full details
 * @param bedId - UUID of the bed
 * @returns Bed data or null if not found
 */
export async function getBedById(
    bedId: string
): Promise<BedManagementData | null> {
    const sql = `
        SELECT 
            b.id,
            b.bed_number as "bedNumber",
            b.ward_id as "wardId",
            w.name as "wardName",
            b.current_stage_id as "currentStageId",
            s.name as "currentStageName",
            b.is_occupied as "isOccupied",
            b.is_active as "isActive",
            b.metadata->>'location' as location,
            b.metadata,
            b.patient_start_time as "patientStartTime",
            b.created_at as "createdAt",
            b.updated_at as "updatedAt"
        FROM beds b
        LEFT JOIN wards w ON b.ward_id = w.id
        LEFT JOIN stages s ON b.current_stage_id = s.id
        WHERE b.id = $1
    `

    const result = await query(sql, [bedId])
    return (result.rows[0] as BedManagementData) || null
}

/**
 * Check if bed number already exists (for validation)
 * @param bedNumber - Bed number to check
 * @param excludeBedId - Optional bed ID to exclude from check (for updates)
 * @returns True if bed number exists
 */
export async function bedNumberExists(
    bedNumber: string,
    excludeBedId?: string
): Promise<boolean> {
    const sql = excludeBedId
        ? `SELECT EXISTS(SELECT 1 FROM beds WHERE bed_number = $1 AND id != $2) as exists`
        : `SELECT EXISTS(SELECT 1 FROM beds WHERE bed_number = $1) as exists`

    const params = excludeBedId ? [bedNumber, excludeBedId] : [bedNumber]
    const result = await query(sql, params)
    return result.rows[0].exists
}

/**
 * Get all wards for dropdown selection
 */
export async function getWards() {
    const sql = `
        SELECT id, name
        FROM wards
        WHERE is_active = true
        ORDER BY name ASC
    `
    const result = await query(sql)
    return result.rows as Array<{ id: string; name: string }>
}

/**
 * Get the default "Empty" stage ID
 */
export async function getEmptyStageId(): Promise<string | null> {
    const sql = `
        SELECT id
        FROM stages
        WHERE name = 'Empty'
        LIMIT 1
    `
    const result = await query(sql)
    return result.rows[0]?.id || null
}
