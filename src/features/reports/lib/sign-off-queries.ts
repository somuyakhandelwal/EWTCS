// Report Sign-Off Queries
// US-12.4: Enable Supervisor Sign-Off on management reports

import 'server-only'
import { query } from '@/shared/lib/db'

export interface SignOff {
    id: string
    reportDate: string       // 'YYYY-MM-DD'
    signedOffBy: string      // username
    signedOffAt: Date
    notes: string | null
    supersededBy: string | null
}

interface RawSignOffRow {
    id: string
    report_date: string
    username: string
    signed_off_at: Date
    notes: string | null
    superseded_by: string | null
}

function mapSignOff(row: RawSignOffRow): SignOff {
    return {
        id: row.id,
        reportDate: typeof row.report_date === 'string'
            ? row.report_date.slice(0, 10)
            : new Date(row.report_date).toISOString().slice(0, 10),
        signedOffBy: row.username,
        signedOffAt: row.signed_off_at,
        notes: row.notes,
        supersededBy: row.superseded_by,
    }
}

/** Get the active (not superseded) sign-off for a given report date, if any. */
export async function getSignOffForDate(reportDate: string): Promise<SignOff | null> {
    const { rows } = await query<RawSignOffRow>(
        `SELECT
            rso.id,
            rso.report_date::text AS report_date,
            u.username,
            rso.signed_off_at,
            rso.notes,
            rso.superseded_by
         FROM report_sign_offs rso
         JOIN users u ON u.id = rso.signed_off_by
         WHERE rso.report_date = $1::date
           AND rso.superseded_by IS NULL
         ORDER BY rso.signed_off_at DESC
         LIMIT 1`,
        [reportDate]
    )
    if (rows.length === 0) return null
    return mapSignOff(rows[0])
}

/**
 * Create a new sign-off for a report date.
 * If one already exists, marks the old one as superseded.
 */
export async function createSignOff(
    reportDate: string,
    userId: string,
    notes?: string
): Promise<SignOff> {
    // Supersede any existing active sign-off for this date
    const { rows: existing } = await query<{ id: string }>(
        `SELECT id FROM report_sign_offs
         WHERE report_date = $1::date AND superseded_by IS NULL`,
        [reportDate]
    )

    const { rows } = await query<RawSignOffRow>(
        `WITH new_signoff AS (
            INSERT INTO report_sign_offs (report_date, signed_off_by, notes)
            VALUES ($1::date, $2, $3)
            RETURNING id, report_date::text AS report_date, signed_off_at, notes, superseded_by, signed_off_by
         )
         SELECT ns.id, ns.report_date, u.username, ns.signed_off_at, ns.notes, ns.superseded_by
         FROM new_signoff ns
         JOIN users u ON u.id = ns.signed_off_by`,
        [reportDate, userId, notes ?? null]
    )

    const newSignOff = mapSignOff(rows[0])

    // Mark old sign-offs as superseded in a separate step
    if (existing.length > 0) {
        await query(
            `UPDATE report_sign_offs SET superseded_by = $1
             WHERE id = ANY($2::uuid[])`,
            [newSignOff.id, existing.map((r) => r.id)]
        )
    }

    return newSignOff
}
