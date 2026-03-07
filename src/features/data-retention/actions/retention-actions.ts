'use server'
// EPIC 14 — Data Retention & Archival
// US-14.1, US-14.2: Archive old logs, configure retention policies

import 'server-only'
import { z } from 'zod'
import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import {
    getRetentionPolicies,
    updateRetentionPolicy,
    getArchiveStats,
    archiveOldLogs,
    searchArchive,
    type RetentionPolicy,
    type ArchiveStats,
    type ArchiveResult,
    type ArchiveFilter,
    type ArchivePage,
} from '../lib/retention-queries'

export interface RetentionDataResult {
    success: boolean
    policies?: RetentionPolicy[]
    stats?: ArchiveStats
    error?: string
}

export async function getRetentionDataAction(): Promise<RetentionDataResult> {
    try {
        await requireRole(['admin'])
    } catch {
        return { success: false, error: 'Unauthorized' }
    }
    try {
        const [policies, stats] = await Promise.all([
            getRetentionPolicies(),
            getArchiveStats(),
        ])
        return { success: true, policies, stats }
    } catch {
        return { success: false, error: 'Failed to load retention data' }
    }
}

const UpdatePolicySchema = z.object({
    entityType: z.string().min(1),
    retainMonths: z.coerce.number().int().min(1).max(120),
})

export interface UpdatePolicyResult {
    success: boolean
    error?: string
}

export async function updateRetentionPolicyAction(
    input: z.input<typeof UpdatePolicySchema>
): Promise<UpdatePolicyResult> {
    let session
    try {
        session = await requireRole(['admin'])
    } catch {
        return { success: false, error: 'Unauthorized' }
    }
    const parsed = UpdatePolicySchema.safeParse(input)
    if (!parsed.success) return { success: false, error: 'Invalid input' }

    try {
        await updateRetentionPolicy(parsed.data.entityType, parsed.data.retainMonths)
        await logAudit({
            actionType: 'UPDATE',
            entityType: 'retention_policy',
            entityId: parsed.data.entityType,
            performedBy: session.userId as string,
            changes: { retain_months: parsed.data.retainMonths },
        })
        return { success: true }
    } catch {
        return { success: false, error: 'Failed to update policy' }
    }
}

const ArchiveSchema = z.object({
    retainMonths: z.coerce.number().int().min(1).max(120),
})

export interface ArchiveActionResult {
    success: boolean
    result?: ArchiveResult
    error?: string
}

export async function runArchiveAction(
    input: z.input<typeof ArchiveSchema>
): Promise<ArchiveActionResult> {
    let session
    try {
        session = await requireRole(['admin'])
    } catch {
        return { success: false, error: 'Unauthorized' }
    }
    const parsed = ArchiveSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: 'Invalid input' }

    try {
        const result = await archiveOldLogs(parsed.data.retainMonths)
        await logAudit({
            actionType: 'DELETE',
            entityType: 'bed_stage_logs',
            entityId: 'archive_run',
            performedBy: session.userId as string,
            changes: { archived_count: result.archivedCount, cutoff_date: result.cutoffDate },
            reason: `Manual archive: retain ${parsed.data.retainMonths} months`,
        })
        return { success: true, result }
    } catch {
        return { success: false, error: 'Archive operation failed' }
    }
}

// ---------------------------------------------------------------------------
// US-14.3: Search archived historical data
// ---------------------------------------------------------------------------

export interface SearchArchiveResult {
    success: boolean
    data?: ArchivePage
    error?: string
}

const SearchArchiveSchema = z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    bedId:     z.string().uuid().optional(),
    page:      z.coerce.number().int().min(1).optional(),
    pageSize:  z.coerce.number().int().min(1).max(100).optional(),
})

export async function searchArchiveAction(
    input: z.input<typeof SearchArchiveSchema>
): Promise<SearchArchiveResult> {
    try {
        await requireRole(['admin', 'auditor'])
    } catch {
        return { success: false, error: 'Unauthorized' }
    }
    const parsed = SearchArchiveSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: 'Invalid filter' }

    try {
        const data = await searchArchive(parsed.data as ArchiveFilter)
        return { success: true, data }
    } catch {
        return { success: false, error: 'Archive search failed' }
    }
}
