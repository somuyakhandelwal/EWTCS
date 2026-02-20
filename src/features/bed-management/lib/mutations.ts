import { query } from '@/shared/lib/db'
import type { CreateBedInput, UpdateBedInput } from '../types/bed-management.types'

/**
 * Create a new bed in the database
 * @param input - Bed creation data
 * @param emptyStageId - ID of the "Empty" stage
 * @returns Created bed ID
 */
export async function createBed(
    input: CreateBedInput,
    emptyStageId: string
): Promise<string> {
    const metadata = input.location ? JSON.stringify({ location: input.location }) : '{}'

    const sql = `
        INSERT INTO beds (
            bed_number,
            ward_id,
            current_stage_id,
            is_occupied,
            is_active,
            metadata,
            created_at,
            updated_at
        ) VALUES ($1, $2, $3, false, true, $4::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
    `

    const result = await query(sql, [
        input.bedNumber,
        input.wardId,
        emptyStageId,
        metadata,
    ])

    return result.rows[0].id
}

/**
 * Update an existing bed
 * @param bedId - ID of bed to update
 * @param input - Update data
 * @returns True if update successful
 */
export async function updateBed(
    bedId: string,
    input: UpdateBedInput
): Promise<boolean> {
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (input.bedNumber !== undefined) {
        updates.push(`bed_number = $${paramIndex}`)
        values.push(input.bedNumber)
        paramIndex++
    }

    if (input.wardId !== undefined) {
        updates.push(`ward_id = $${paramIndex}`)
        values.push(input.wardId)
        paramIndex++
    }

    if (input.location !== undefined) {
        updates.push(`metadata = metadata || $${paramIndex}::jsonb`)
        values.push(JSON.stringify({ location: input.location }))
        paramIndex++
    }

    // Always update the updated_at timestamp
    updates.push(`updated_at = CURRENT_TIMESTAMP`)

    if (updates.length === 1) {
        // Only updated_at, nothing to update
        return true
    }

    values.push(bedId)

    const sql = `
        UPDATE beds
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
    `

    const result = await query(sql, values)
    return (result.rowCount ?? 0) > 0
}

/**
 * Deactivate a bed (soft delete)
 * @param bedId - ID of bed to deactivate
 * @returns True if deactivation successful
 */
export async function deactivateBed(bedId: string): Promise<boolean> {
    const sql = `
        UPDATE beds
        SET is_active = false,
            is_temporary = false,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND is_occupied = false
    `

    const result = await query(sql, [bedId])
    return (result.rowCount ?? 0) > 0
}

/**
 * Reactivate a bed
 * @param bedId - ID of bed to reactivate
 * @returns True if reactivation successful
 */
export async function reactivateBed(bedId: string): Promise<boolean> {
    const sql = `
        UPDATE beds
        SET is_active = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
    `

    const result = await query(sql, [bedId])
    return (result.rowCount ?? 0) > 0
}
