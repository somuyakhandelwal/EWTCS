'use server'

import { requireAdmin } from '@/shared/lib/auth'
import { getAllBedsForManagement, getWards } from '../lib/queries'
import type { ActionResult } from '../types/action-result'

/**
 * Get all beds for management view
 * @param includeInactive - Whether to include deactivated beds
 * @returns Beds array or error
 */
export async function getAllBeds(
    includeInactive: boolean = false
): Promise<ActionResult> {
    try {
        await requireAdmin()
        const beds = await getAllBedsForManagement(includeInactive)
        return { success: true, data: beds }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch beds'
        return { success: false, error: message }
    }
}

/**
 * Get all wards for dropdown selection
 * @returns Wards array or error
 */
export async function getWardsList(): Promise<ActionResult> {
    try {
        await requireAdmin()
        const wards = await getWards()
        return { success: true, data: wards }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch wards'
        return { success: false, error: message }
    }
}
