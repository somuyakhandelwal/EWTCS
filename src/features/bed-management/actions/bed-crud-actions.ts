'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { createBedSchema, updateBedSchema } from '../schemas/bed-management-schemas'
import { getBedById, bedNumberExists, getEmptyStageId } from '../lib/queries'
import {
    createBed as createBedMutation,
    updateBed as updateBedMutation,
} from '../lib/mutations'

export type ActionResult<T = unknown> = {
    success: boolean
    data?: T
    error?: string
}

/**
 * Helper function to revalidate relevant pages after bed changes
 */
function revalidateBedPages() {
    revalidatePath('/admin/beds')
    revalidatePath('/dashboard')
    revalidatePath('/supervisor')
}

/**
 * Create a new bed
 * @param formData - Form data with bedNumber, wardId, location
 * @returns Success with bed ID or error
 */
export async function createBed(formData: FormData): Promise<ActionResult> {
    try {
        const session = await requireAdmin()

        // Parse and validate input
        const input = {
            bedNumber: formData.get('bedNumber') as string,
            wardId: formData.get('wardId') as string,
            location: formData.get('location') as string || undefined,
        }

        const validated = createBedSchema.parse(input)

        // Check if bed number already exists
        const exists = await bedNumberExists(validated.bedNumber)
        if (exists) {
            return {
                success: false,
                error: `Bed number "${validated.bedNumber}" already exists`,
            }
        }

        // Get the "Empty" stage ID
        const emptyStageId = await getEmptyStageId()
        if (!emptyStageId) {
            return {
                success: false,
                error: 'Empty stage not found in database',
            }
        }

        // Create bed
        const bedId = await createBedMutation(validated, emptyStageId)

        // Log audit trail
        await logAudit({
            actionType: 'CREATE',
            entityType: 'bed',
            entityId: bedId,
            performedBy: session.userId,
            changes: validated,
            reason: 'New bed created via admin panel',
        })

        // Revalidate pages
        revalidateBedPages()

        return {
            success: true,
            data: { bedId, message: 'Bed created successfully' },
        }
    } catch (error) {
        if (error instanceof Error && error.name === 'ZodError') {
            return { success: false, error: 'Invalid input data' }
        }
        const message = error instanceof Error ? error.message : 'Failed to create bed'
        return { success: false, error: message }
    }
}

/**
 * Update an existing bed
 * @param formData - Form data with bedId and fields to update
 * @returns Success or error
 */
export async function updateBed(formData: FormData): Promise<ActionResult> {
    try {
        const session = await requireAdmin()

        // Parse and validate input
        const input = {
            bedId: formData.get('bedId') as string,
            bedNumber: formData.get('bedNumber') as string || undefined,
            wardId: formData.get('wardId') as string || undefined,
            location: formData.get('location') as string || undefined,
        }

        const validated = updateBedSchema.parse(input)

        // Get current bed data
        const currentBed = await getBedById(validated.bedId)
        if (!currentBed) {
            return { success: false, error: 'Bed not found' }
        }

        // Check if bed number is being changed and if new number already exists
        if (validated.bedNumber && validated.bedNumber !== currentBed.bedNumber) {
            const exists = await bedNumberExists(validated.bedNumber, validated.bedId)
            if (exists) {
                return {
                    success: false,
                    error: `Bed number "${validated.bedNumber}" already exists`,
                }
            }
        }

        // Update bed
        const { bedId, ...updateData } = validated
        const success = await updateBedMutation(bedId, updateData)

        if (!success) {
            return { success: false, error: 'Failed to update bed' }
        }

        // Log audit trail
        await logAudit({
            actionType: 'UPDATE',
            entityType: 'bed',
            entityId: bedId,
            performedBy: session.userId,
            changes: updateData,
            reason: 'Bed updated via admin panel',
        })

        // Revalidate pages
        revalidateBedPages()

        return {
            success: true,
            data: { message: 'Bed updated successfully' },
        }
    } catch (error) {
        if (error instanceof Error && error.name === 'ZodError') {
            return { success: false, error: 'Invalid input data' }
        }
        const message = error instanceof Error ? error.message : 'Failed to update bed'
        return { success: false, error: message }
    }
}
