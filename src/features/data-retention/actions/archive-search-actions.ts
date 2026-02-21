'use server'
// archive-search-actions.ts — server actions for US-14.3
// EPIC 14: Auditor Archive Retrieval
//
// All access requires admin or auditor role.
// Every retrieval is audit-logged to satisfy AC: "Retrieval is logged".

import { z } from 'zod'
import { requireRole } from '@/shared/lib/auth'
import { logger } from '@/shared/config/logger'
import { logAudit } from '@/shared/lib/audit'
import {
  searchArchivedAdmissions,
  searchArchivedAuditLogs,
} from '../lib/archive-search-queries'
import type { ArchivedAdmission, ArchivedAuditLog } from '../lib/data-retention-types'

// ── Validation schema ─────────────────────────────────────────────────────

const ArchiveSearchSchema = z.object({
  table: z.enum(['patient_admissions', 'audit_logs']),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD')
    .refine((d) => !isNaN(Date.parse(d)), 'from must be a valid date'),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be YYYY-MM-DD')
    .refine((d) => !isNaN(Date.parse(d)), 'to must be a valid date'),
  limit: z.number().int().min(1).max(1000).optional(),
})

// ── Result types ──────────────────────────────────────────────────────────

export interface ArchiveSearchResult {
  success: boolean
  data?: ArchivedAdmission[] | ArchivedAuditLog[]
  table?: 'patient_admissions' | 'audit_logs'
  rowCount?: number
  error?: string
}

// ── Actions ───────────────────────────────────────────────────────────────

/**
 * Search archived records by date range.
 * Accessible to admin and auditor only (AC: "Retrieval available to authorized users only").
 *
 * Note: Archive queries may take longer than active-data queries because
 * the archive tables are not in the hot PostgreSQL buffer cache. This is
 * expected and acceptable per AC: "Retrieval may take longer than active data".
 */
export async function searchArchive(
  rawParams: unknown,
): Promise<ArchiveSearchResult> {
  try {
    const session = await requireRole(['admin', 'auditor'])

    const parsed = ArchiveSearchSchema.safeParse(rawParams)
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid search parameters'
      return { success: false, error }
    }

    const params = parsed.data

    // Validate that from ≤ to
    if (new Date(params.from) > new Date(params.to)) {
      return { success: false, error: '"from" date must not be after "to" date' }
    }

    logger.info('Archive search initiated', {
      table: params.table,
      from: params.from,
      to: params.to,
      requestedBy: session.userId,
    })

    let data: ArchivedAdmission[] | ArchivedAuditLog[]
    if (params.table === 'patient_admissions') {
      data = await searchArchivedAdmissions(params)
    } else {
      data = await searchArchivedAuditLogs(params)
    }

    // AC: "Retrieval is logged" — audit every archive read
    await logAudit({
      actionType: 'ARCHIVE_READ',
      entityType: params.table,
      entityId: `${params.from}__${params.to}`,
      performedBy: session.userId,
      metadata: {
        table: params.table,
        from: params.from,
        to: params.to,
        rowsReturned: data.length,
      },
    })

    logger.info('Archive search completed', {
      table: params.table,
      rowsReturned: data.length,
    })

    return {
      success: true,
      data,
      table: params.table,
      rowCount: data.length,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Archive search failed'
    logger.error('searchArchive failed', error as Error)
    return { success: false, error: message }
  }
}
