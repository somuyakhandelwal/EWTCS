'use server'
// EPIC 12 — Audit Logs & Compliance
// US-12.1: As an admin, I can view a filtered, paginated audit log of all user actions

import 'server-only'
import { z } from 'zod'
import { requireRole } from '@/shared/lib/auth'
import {
    getAuditLogPage,
    getAuditEntityTypes,
    type AuditLogPage,
    type AuditLogFilter,
} from '@/shared/lib/audit'

const AuditFilterSchema = z.object({
    entityType: z.string().optional(),
    actionType: z.string().optional(),
    userId: z.string().uuid().optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(10).max(200).default(50),
})

export type AuditLogFilterInput = z.input<typeof AuditFilterSchema>

export interface AuditLogActionResult {
    success: boolean
    data?: AuditLogPage
    error?: string
}

export async function getAuditLogsAction(
    input: AuditLogFilterInput
): Promise<AuditLogActionResult> {
    try {
        await requireRole(['admin', 'auditor'])
    } catch {
        return { success: false, error: 'Unauthorized' }
    }

    const parsed = AuditFilterSchema.safeParse(input)
    if (!parsed.success) {
        return { success: false, error: 'Invalid filter parameters' }
    }

    try {
        const filter: AuditLogFilter = parsed.data
        const data = await getAuditLogPage(filter)
        return { success: true, data }
    } catch {
        return { success: false, error: 'Failed to load audit logs' }
    }
}

export interface AuditEntityTypesResult {
    success: boolean
    entityTypes?: string[]
    error?: string
}

export async function getAuditEntityTypesAction(): Promise<AuditEntityTypesResult> {
    try {
        await requireRole(['admin', 'auditor'])
    } catch {
        return { success: false, error: 'Unauthorized' }
    }
    try {
        const entityTypes = await getAuditEntityTypes()
        return { success: true, entityTypes }
    } catch {
        return { success: false, error: 'Failed to load entity types' }
    }
}
