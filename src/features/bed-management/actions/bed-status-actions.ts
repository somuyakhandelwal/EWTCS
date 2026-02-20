'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminWrite } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { toggleBedStatusSchema } from '../schemas/bed-management-schemas'
import { getBedById } from '../lib/queries'
import {
    deactivateBed as deactivateBedMutation,
    reactivateBed as reactivateBedMutation,
} from '../lib/mutations'
import type { ActionResult } from '../types/action-result'

/**
 * Helper function to revalidate relevant pages after bed changes
 */
function revalidateBedPages() {
    revalidatePath('/admin/beds')
    revalidatePath('/dashboard')
    revalidatePath('/supervisor')
}

/**
 * Deactivate a bed (soft delete)
 * @param formData - Form data with bedId
 * @returns Success or error
 */
export async function deactivateBed(formData: FormData): Promise<ActionResult> {
    try {
        const session = await requireAdminWrite({
            actionType: 'UPDATE',
            entityType: 'bed',
            entityId: formData.get('bedId') as string || 'unknown',
        })

        const input = {
            bedId: formData.get('bedId') as string,
        }

        const validated = toggleBedStatusSchema.parse(input)

        // Get current bed data
        const bed = await getBedById(validated.bedId)
        if (!bed) {
            return { success: false, error: 'Bed not found' }
        }

        // Check if bed is occupied
        if (bed.isOccupied) {
            return {
                success: false,
                error: 'Cannot deactivate an occupied bed',
            }
        }

        // Deactivate bed
        const success = await deactivateBedMutation(validated.bedId)

        if (!success) {
            return { success: false, error: 'Failed to deactivate bed' }
        }

        // Log audit trail
        await logAudit({
            actionType: 'UPDATE',
            entityType: 'bed',
            entityId: validated.bedId,
            performedBy: session.userId,
            changes: { isActive: false },
            reason: 'Bed deactivated via admin panel',
        })

        // Revalidate pages
        revalidateBedPages()

        return {
            success: true,
            data: { message: 'Bed deactivated successfully' },
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to deactivate bed'
        return { success: false, error: message }
    }
}

/**
 * Reactivate a bed
 * @param formData - Form data with bedId
 * @returns Success or error
 */
export async function reactivateBed(formData: FormData): Promise<ActionResult> {
    try {
        const session = await requireAdminWrite({
            actionType: 'UPDATE',
            entityType: 'bed',
            entityId: formData.get('bedId') as string || 'unknown',
        })

        const input = {
            bedId: formData.get('bedId') as string,
        }

        const validated = toggleBedStatusSchema.parse(input)

        // Reactivate bed
        const success = await reactivateBedMutation(validated.bedId)

        if (!success) {
            return { success: false, error: 'Failed to reactivate bed' }
        }

        // Log audit trail
        await logAudit({
            actionType: 'UPDATE',
            entityType: 'bed',
            entityId: validated.bedId,
            performedBy: session.userId,
            changes: { isActive: true },
            reason: 'Bed reactivated via admin panel',
        })

        // Revalidate pages
        revalidateBedPages()

        return {
            success: true,
            data: { message: 'Bed reactivated successfully' },
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to reactivate bed'
        return { success: false, error: message }
    }
}
