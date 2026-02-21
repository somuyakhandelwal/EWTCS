// Virtual Bed Mutations
// Epic 6: Bed & Workflow Configuration (US-6.6)
// Purpose: SQL writes specific to nurse-created hallway/stretcher virtual beds

import { query } from '@/shared/lib/db'

/**
 * Insert a new virtual (hallway/stretcher) bed into the database.
 * Sets is_temporary = true AND is_virtual = true, is_active = true.
 * Virtual beds are always temporary — they are removed when the patient is admitted
 * to a real bed or discharged.
 *
 * @param label        - Free-text descriptive label (e.g., "Hallway Stretcher 3")
 * @param wardId       - Ward UUID from the calling user's session
 * @param emptyStageId - ID of the "Empty" stage for initial state
 * @param location     - Optional free-text location note (e.g., "Corridor B")
 * @returns UUID of the newly created bed
 */
export async function createVirtualBedInDB(
    label: string,
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
            is_virtual,
            metadata,
            created_at,
            updated_at
        ) VALUES ($1, $2, $3, false, true, true, true, $4::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id`,
        [label, wardId, emptyStageId, metadata]
    )

    return result.rows[0].id as string
}

/**
 * Deactivate a virtual bed (soft-delete).
 * Blocked at the DB level if the bed is still occupied.
 *
 * @param bedId - UUID of the virtual bed to remove
 * @returns true if the row was updated, false if occupied or not found
 */
export async function removeVirtualBedFromDB(bedId: string): Promise<boolean> {
    const result = await query(
        `UPDATE beds
         SET is_active = false, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
           AND is_virtual = true
           AND is_occupied = false`,
        [bedId]
    )

    return (result.rowCount ?? 0) > 0
}
