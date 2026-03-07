// Temporary Bed Mutations
// Epic 6: Bed & Workflow Configuration (US-6.5)
// Purpose: SQL writes specific to supervisor-created surge beds

import { query } from '@/shared/lib/db'

/**
 * Insert a new temporary (surge) bed into the database.
 * Sets is_temporary = true and is_active = true.
 * Ward is inherited from the calling supervisor's ward_id.
 *
 * @param bedNumber  - Unique bed identifier (e.g., SURGE-01)
 * @param wardId     - Ward UUID from the supervisor's session
 * @param emptyStageId - ID of the "Empty" stage for initial state
 * @param location   - Optional free-text location note
 * @returns UUID of the newly created bed
 */
export async function createTemporaryBedInDB(
    bedNumber: string,
    wardId: string | null,
    emptyStageId: string,
    location?: string
): Promise<string> {
    const metadata = location ? JSON.stringify({ location }) : '{}'

    const result = await query(
        `INSERT INTO beds (
            bed_number,
            ward_id,
            current_stage_id,
            is_occupied,
            is_active,
            is_temporary,
            metadata,
            created_at,
            updated_at
        ) VALUES ($1, $2, $3, false, true, true, $4::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id`,
        [bedNumber, wardId, emptyStageId, metadata]
    )

    return result.rows[0].id as string
}

/**
 * Deactivate a temporary bed (soft-delete).
 * Blocked at the DB level if bed is still occupied (returns false).
 *
 * @param bedId - UUID of the temporary bed to remove
 * @returns true if the row was updated, false if occupied or not found
 */
export async function removeTemporaryBedFromDB(bedId: string): Promise<boolean> {
    const result = await query(
        `UPDATE beds
         SET is_active = false, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
           AND is_temporary = true
           AND is_occupied = false`,
        [bedId]
    )

    return (result.rowCount ?? 0) > 0
}
