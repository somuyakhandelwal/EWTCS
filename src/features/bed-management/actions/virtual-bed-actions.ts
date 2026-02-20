'use server'
// Virtual Bed Server Actions
// Epic 6: Bed & Workflow Configuration (US-6.6)
// Purpose: Allow nurses, supervisors, and admins to track hallway/stretcher patients
//
// Authorization: requireRole(['nurse', 'supervisor', 'admin'])
// The bed is assigned to the caller's ward. No ward picker required.

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { logger } from '@/shared/config/logger'
import pool from '@/shared/lib/db'
import { createVirtualBedSchema, toggleBedStatusSchema } from '../schemas/bed-management-schemas'
import { getEmptyStageId, getBedById } from '../lib/queries'
import {
    createVirtualBedInDB,
    removeVirtualBedFromDB,
} from '../lib/virtual-bed-mutations'
import type { ActionResult } from '../types/action-result'

/** Revalidate all pages that render bed data */
function revalidateBedPages() {
    revalidatePath('/dashboard')
    revalidatePath('/supervisor')
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
 * Create a virtual (hallway/stretcher) bed — nurse, supervisor, or admin (US-6.6).
 * The bed is marked is_temporary = true AND is_virtual = true, assigned to the caller's ward.
 *
 * @param formData - label (required), location (optional)
 */
export async function createVirtualBed(formData: FormData): Promise<ActionResult> {
    try {
        const session = await requireRole(['nurse', 'supervisor', 'admin'])

        const input = {
            label: formData.get('label') as string,
            location: (formData.get('location') as string) || undefined,
        }

        const validated = createVirtualBedSchema.parse(input)

        const emptyStageId = await getEmptyStageId()
        if (!emptyStageId) {
            return { success: false, error: 'Empty stage not found in database' }
        }

        const wardId = await getUserWardId(session.userId)

        const bedId = await createVirtualBedInDB(
            validated.label,
            wardId,
            emptyStageId,
            validated.location
        )

        await logAudit({
            actionType: 'CREATE',
            entityType: 'bed',
            entityId: bedId,
            performedBy: session.userId,
            changes: { ...validated, isTemporary: true, isVirtual: true },
            reason: 'Virtual hallway/stretcher bed created',
        })

        logger.info('Virtual bed created', {
            bedId,
            label: validated.label,
            createdBy: session.userId,
        })

        revalidateBedPages()

        return { success: true, data: { bedId, message: 'Virtual bed created successfully' } }
    } catch (error) {
        if (error instanceof Error && error.name === 'ZodError') {
            return { success: false, error: 'Invalid input data' }
        }
        const message = error instanceof Error ? error.message : 'Failed to create virtual bed'
        logger.error('Failed to create virtual bed', error as Error)
        return { success: false, error: message }
    }
}

/**
 * Remove (deactivate) a virtual bed — nurse, supervisor, or admin (US-6.6).
 * Blocked if the bed is currently occupied.
 *
 * @param formData - bedId (UUID)
 */
export async function removeVirtualBed(formData: FormData): Promise<ActionResult> {
    try {
        const session = await requireRole(['nurse', 'supervisor', 'admin'])

        const input = { bedId: formData.get('bedId') as string }
        const validated = toggleBedStatusSchema.parse(input)

        const bed = await getBedById(validated.bedId)
        if (!bed) {
            return { success: false, error: 'Bed not found' }
        }
        if (!bed.isVirtual) {
            return { success: false, error: 'Only virtual beds can be removed here' }
        }
        if (bed.isOccupied) {
            return { success: false, error: 'Cannot remove an occupied bed' }
        }

        const success = await removeVirtualBedFromDB(validated.bedId)
        if (!success) {
            return { success: false, error: 'Failed to remove virtual bed' }
        }

        await logAudit({
            actionType: 'DEACTIVATE',
            entityType: 'bed',
            entityId: validated.bedId,
            performedBy: session.userId,
            changes: { isActive: false, isVirtual: true, isTemporary: true },
            reason: 'Virtual hallway/stretcher bed removed',
        })

        logger.info('Virtual bed removed', {
            bedId: validated.bedId,
            removedBy: session.userId,
        })

        revalidateBedPages()

        return { success: true, data: { message: 'Virtual bed removed successfully' } }
    } catch (error) {
        if (error instanceof Error && error.name === 'ZodError') {
            return { success: false, error: 'Invalid input data' }
        }
        const message = error instanceof Error ? error.message : 'Failed to remove virtual bed'
        logger.error('Failed to remove virtual bed', error as Error)
        return { success: false, error: message }
    }
}
