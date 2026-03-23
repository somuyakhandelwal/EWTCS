'use server'
// Temporary Bed Server Actions
// Epic 6: Bed & Workflow Configuration (US-6.5)
// Purpose: Allow supervisors to add/remove surge beds during MCI events
//
// Authorization: requireRole(['supervisor', 'admin'])
// Supervisors use their own ward — no ward picker required.

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { logger } from '@/shared/config/logger'
import pool from '@/shared/lib/db'
import { createTemporaryBedSchema, toggleBedStatusSchema } from '../schemas/bed-management-schemas'
import { getEmptyStageId, getBedById, bedNumberExists } from '../lib/queries'
import {
    createTemporaryBedInDB,
    removeTemporaryBedFromDB,
} from '../lib/temporary-bed-mutations'
import type { ActionResult } from '../types/action-result'

/** Revalidate all pages that render bed data */
function revalidateBedPages() {
    revalidatePath('/supervisor')
    revalidatePath('/dashboard')
    revalidatePath('/triage')
    revalidatePath('/admin/beds')
}

/**
 * Fetch the ward_id assigned to a user in the database.
 * Returns null when the user has no ward assignment (e.g., cross-ward admin).
 */
async function getUserWardId(userId: string): Promise<string | null> {
    const { rows } = await pool.query(
        'SELECT ward_id FROM users WHERE id = $1',
        [userId]
    )
    return (rows[0]?.ward_id as string | null) ?? null
}

/**
 * Create a temporary (surge) bed — supervisor or admin only (US-6.5).
 * The bed is marked is_temporary = true and assigned to the caller's ward.
 *
 * @param formData - bedNumber (required), location (optional)
 */
export async function createTemporaryBed(formData: FormData): Promise<ActionResult> {
    try {
        const session = await requireRole(['supervisor', 'admin'])

        const input = {
            bedNumber: formData.get('bedNumber') as string,
            location: (formData.get('location') as string) || undefined,
        }

        const validated = createTemporaryBedSchema.parse(input)

        // BUG FIX #1: Check for duplicate bed number before hitting the DB constraint
        const exists = await bedNumberExists(validated.bedNumber)
        if (exists) {
            return {
                success: false,
                error: `Bed number "${validated.bedNumber}" already exists`,
            }
        }

        const emptyStageId = await getEmptyStageId()
        if (!emptyStageId) {
            return { success: false, error: 'Empty stage not found in database' }
        }

        // Resolve the supervisor's ward so the bed is assigned correctly
        const wardId = await getUserWardId(session.userId)

        const bedId = await createTemporaryBedInDB(
            validated.bedNumber,
            wardId,
            emptyStageId,
            validated.location
        )

        await logAudit({
            actionType: 'CREATE',
            entityType: 'bed',
            entityId: bedId,
            performedBy: session.userId,
            changes: { ...validated, isTemporary: true },
            reason: 'Temporary surge bed created by supervisor',
        })

        logger.info('Temporary bed created', {
            bedId,
            bedNumber: validated.bedNumber,
            createdBy: session.userId,
        })

        revalidateBedPages()

        return { success: true, data: { bedId, message: 'Temporary bed created successfully' } }
    } catch (error) {
        if (error instanceof Error && error.name === 'ZodError') {
            return { success: false, error: 'Invalid input data' }
        }
        const message = error instanceof Error ? error.message : 'Failed to create temporary bed'
        logger.error('Failed to create temporary bed', error as Error)
        return { success: false, error: message }
    }
}

/**
 * Remove (deactivate) a temporary bed — supervisor or admin only (US-6.5).
 * Blocked if the bed is currently occupied.
 *
 * @param formData - bedId (UUID)
 */
export async function removeTemporaryBed(formData: FormData): Promise<ActionResult> {
    try {
        const session = await requireRole(['supervisor', 'admin'])

        const input = { bedId: formData.get('bedId') as string }
        const validated = toggleBedStatusSchema.parse(input)

        const bed = await getBedById(validated.bedId)
        if (!bed) {
            return { success: false, error: 'Bed not found' }
        }
        if (!bed.isTemporary) {
            return { success: false, error: 'Only temporary beds can be removed here' }
        }
        if (bed.isOccupied) {
            return { success: false, error: 'Cannot remove an occupied bed' }
        }

        const success = await removeTemporaryBedFromDB(validated.bedId)
        if (!success) {
            return { success: false, error: 'Failed to remove temporary bed' }
        }

        await logAudit({
            actionType: 'DEACTIVATE',
            entityType: 'bed',
            entityId: validated.bedId,
            performedBy: session.userId,
            changes: { isActive: false, isTemporary: true },
            reason: 'Temporary surge bed removed by supervisor',
        })

        logger.info('Temporary bed removed', {
            bedId: validated.bedId,
            removedBy: session.userId,
        })

        revalidateBedPages()

        return { success: true, data: { message: 'Temporary bed removed successfully' } }
    } catch (error) {
        if (error instanceof Error && error.name === 'ZodError') {
            return { success: false, error: 'Invalid input data' }
        }
        const message = error instanceof Error ? error.message : 'Failed to remove temporary bed'
        logger.error('Failed to remove temporary bed', error as Error)
        return { success: false, error: message }
    }
}
