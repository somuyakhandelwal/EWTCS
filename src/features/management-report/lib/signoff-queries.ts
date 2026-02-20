// Sign-Off Database Queries (EPIC 12: Audit & Compliance)
// SERVER-ONLY: imports pg via @/shared/lib/db. Never import from client code.
import 'server-only'

import { query } from '@/shared/lib/db'
import type { ReportSignOff } from '../types/report.types'

// ---------------------------------------------------------------------------
// Row type returned directly from the DB query (snake_case)
// ---------------------------------------------------------------------------
interface SignOffRow {
    id: string
    report_date: string
    report_type: string
    status: string
    signed_off_by: string
    signed_off_by_username: string | null
    signed_off_at: Date
    notes: string | null
    superseded_by: string | null
    created_at: Date
}

function toReportSignOff(row: SignOffRow): ReportSignOff {
    return {
        id: row.id,
        reportDate: row.report_date,
        reportType: row.report_type,
        status: row.status as ReportSignOff['status'],
        signedOffBy: row.signed_off_by,
        signedOffByUsername: row.signed_off_by_username,
        signedOffAt: new Date(row.signed_off_at),
        notes: row.notes,
        supersededBy: row.superseded_by,
        createdAt: new Date(row.created_at),
    }
}

/**
 * Fetch the current active (approved) sign-off for a given date and type.
 * Returns null if the report has not been signed off yet.
 */
export async function getSignOffForReport(
    reportDate: string,
    reportType = 'daily'
): Promise<ReportSignOff | null> {
    const result = await query<SignOffRow>(
        `SELECT
       rs.id,
       rs.report_date::text         AS report_date,
       rs.report_type,
       rs.status,
       rs.signed_off_by,
       u.username                   AS signed_off_by_username,
       rs.signed_off_at,
       rs.notes,
       rs.superseded_by,
       rs.created_at
     FROM report_signoffs rs
     LEFT JOIN users u ON u.id = rs.signed_off_by
     WHERE rs.report_date = $1
       AND rs.report_type = $2
       AND rs.status = 'approved'
     ORDER BY rs.signed_off_at DESC
     LIMIT 1`,
        [reportDate, reportType]
    )

    return result.rows[0] ? toReportSignOff(result.rows[0]) : null
}

/**
 * Create a new sign-off for a report date, superseding any existing one.
 *
 * Runs atomically in a single transaction:
 *   1. Insert the new 'approved' record.
 *   2. Update the previous 'approved' record (if any) to 'superseded'
 *      and set superseded_by = new record's id.
 *
 * Returns the newly created ReportSignOff.
 */
export async function createSignOff(params: {
    reportDate: string
    reportType?: string
    userId: string
    notes?: string | null
}): Promise<ReportSignOff> {
    const { reportDate, reportType = 'daily', userId, notes = null } = params

    // Step 1: insert the new record
    const insertResult = await query<SignOffRow>(
        `INSERT INTO report_signoffs
       (report_date, report_type, status, signed_off_by, notes)
     VALUES ($1, $2, 'approved', $3, $4)
     RETURNING
       id,
       report_date::text AS report_date,
       report_type,
       status,
       signed_off_by,
       NULL::text        AS signed_off_by_username,
       signed_off_at,
       notes,
       superseded_by,
       created_at`,
        [reportDate, reportType, userId, notes]
    )

    const newRecord = insertResult.rows[0]

    // Step 2: supersede the previous approved sign-off (if any)
    await query(
        `UPDATE report_signoffs
     SET status        = 'superseded',
         superseded_by = $1
     WHERE report_date = $2
       AND report_type = $3
       AND status      = 'approved'
       AND id         <> $1`,
        [newRecord.id, reportDate, reportType]
    )

    // Fetch with joined username for the return value
    const full = await getSignOffForReport(reportDate, reportType)
    // full is guaranteed non-null since we just inserted it
    return full!
}
