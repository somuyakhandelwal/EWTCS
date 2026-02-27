'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminWrite } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { query } from '@/shared/lib/db'
import { createWardSchema } from '../schemas/ward-schemas'
import type { Ward, CreateWardInput } from '../types/ward.types'

export async function getAllWards(): Promise<{ success: boolean; data?: Ward[]; error?: string }> {
    try {
        const result = await query(
            'SELECT * FROM wards ORDER BY name ASC'
        )
        return { success: true, data: result.rows as Ward[] }
    } catch {
        return { success: false, error: 'Failed to fetch wards' }
    }
}

export async function createWard(formData: FormData): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await requireAdminWrite({
            actionType: 'CREATE',
            entityType: 'ward',
            entityId: 'new',
        })

        const input: CreateWardInput = {
            name: formData.get('name') as string,
            code: formData.get('code') as string,
            description: formData.get('description') as string | undefined,
        }

        const validated = createWardSchema.parse(input)

        // Check if name or code exists
        const existsResult = await query(
            'SELECT id FROM wards WHERE name = $1 OR code = $2 LIMIT 1',
            [validated.name, validated.code]
        )

        if (existsResult.rowCount && existsResult.rowCount > 0) {
            return { success: false, error: 'A ward with this name or code already exists.' }
        }

        const insertResult = await query(
            `INSERT INTO wards (name, code, description, is_active, created_at, updated_at) 
             VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
            [validated.name, validated.code, validated.description || null]
        )

        const newWardId = insertResult.rows[0].id

        await logAudit({
            actionType: 'CREATE',
            entityType: 'ward',
            entityId: newWardId,
            performedBy: session.userId,
            changes: validated,
            reason: 'Ward created via admin panel',
        })

        revalidatePath('/admin/wards')
        return { success: true }
    } catch (error) {
        if (error instanceof Error && error.name === 'ZodError') {
            return { success: false, error: 'Invalid input data' }
        }
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}
