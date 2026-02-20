// archive-search-queries.ts — date-range search over archive tables
// EPIC 14 — US-14.3: Auditor Archive Retrieval
//
// Queries run against the *_archive tables (cold store).
// Results are intentionally limited to prevent runaway scans.

import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type {
  ArchiveSearchParams,
  ArchivedAdmission,
  ArchivedAuditLog,
} from './data-retention-types'

const DEFAULT_LIMIT = 200
const MAX_LIMIT = 1000

/**
 * Returns a Date representing the end of the given YYYY-MM-DD day in UTC
 * (23:59:59.999 UTC). Using setHours() would apply local-timezone offsets
 * which silently shifts the boundary on non-UTC servers.
 */
function endOfDayUTC(dateStr: string): Date {
  // dateStr is YYYY-MM-DD; appending T23:59:59.999Z pins the time to UTC.
  return new Date(`${dateStr}T23:59:59.999Z`)
}

// ── Internal row types ────────────────────────────────────────────────────

interface RawAdmissionRow {
  id: string
  bed_id: string
  admitted_at: string
  discharged_at: string
  total_duration_ms: string
  discharged_by_user_id: string
  notes: string | null
  created_at: string
  tat_from_previous_discharge_ms: string | null
  archived_at: string
}

interface RawAuditLogRow {
  id: string
  action_type: string
  entity_type: string
  entity_id: string
  performed_by_user_id: string
  changes: Record<string, unknown>
  reason: string | null
  metadata: Record<string, unknown>
  ip_address: string | null
  created_at: string
  archived_at: string
}

// ── Mappers ───────────────────────────────────────────────────────────────

function mapAdmission(row: RawAdmissionRow): ArchivedAdmission {
  return {
    id: row.id,
    bedId: row.bed_id,
    admittedAt: new Date(row.admitted_at),
    dischargedAt: new Date(row.discharged_at),
    totalDurationMs: Number(row.total_duration_ms),
    dischargedByUserId: row.discharged_by_user_id,
    notes: row.notes,
    createdAt: new Date(row.created_at),
    tatFromPreviousDischargeMs: row.tat_from_previous_discharge_ms
      ? Number(row.tat_from_previous_discharge_ms)
      : null,
    archivedAt: new Date(row.archived_at),
  }
}

function mapAuditLog(row: RawAuditLogRow): ArchivedAuditLog {
  return {
    id: row.id,
    actionType: row.action_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    performedByUserId: row.performed_by_user_id,
    changes: row.changes ?? {},
    reason: row.reason,
    metadata: row.metadata ?? {},
    ipAddress: row.ip_address,
    createdAt: new Date(row.created_at),
    archivedAt: new Date(row.archived_at),
  }
}

// ── Public query functions ────────────────────────────────────────────────

/**
 * Search patient_admissions_archive by discharge date range.
 * Uses discharged_at as the primary filter (most useful for auditors).
 */
export async function searchArchivedAdmissions(
  params: ArchiveSearchParams,
): Promise<ArchivedAdmission[]> {
  const limit = Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT)
  const fromDate = new Date(`${params.from}T00:00:00.000Z`)
  const toDate = endOfDayUTC(params.to)

  try {
    const result = await query<RawAdmissionRow>(
      `SELECT
         id, bed_id, admitted_at, discharged_at,
         total_duration_ms, discharged_by_user_id,
         notes, created_at, tat_from_previous_discharge_ms, archived_at
       FROM patient_admissions_archive
       WHERE discharged_at >= $1
         AND discharged_at <= $2
       ORDER BY discharged_at DESC
       LIMIT $3`,
      [fromDate, toDate, limit],
    )

    logger.info('Archived admissions searched', {
      from: params.from,
      to: params.to,
      rowsReturned: result.rows.length,
    })

    return result.rows.map(mapAdmission)
  } catch (error) {
    logger.error('Failed to search archived admissions', error as Error)
    throw new Error('Failed to retrieve archived admissions')
  }
}

/**
 * Search audit_logs_archive by created_at date range.
 */
export async function searchArchivedAuditLogs(
  params: ArchiveSearchParams,
): Promise<ArchivedAuditLog[]> {
  const limit = Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT)
  const fromDate = new Date(`${params.from}T00:00:00.000Z`)
  const toDate = endOfDayUTC(params.to)

  try {
    const result = await query<RawAuditLogRow>(
      `SELECT
         id, action_type, entity_type, entity_id,
         performed_by_user_id, changes, reason,
         metadata, ip_address, created_at, archived_at
       FROM audit_logs_archive
       WHERE created_at >= $1
         AND created_at <= $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [fromDate, toDate, limit],
    )

    logger.info('Archived audit logs searched', {
      from: params.from,
      to: params.to,
      rowsReturned: result.rows.length,
    })

    return result.rows.map(mapAuditLog)
  } catch (error) {
    logger.error('Failed to search archived audit logs', error as Error)
    throw new Error('Failed to retrieve archived audit logs')
  }
}
