'use server'
// Sign-Off Server Actions (EPIC 12: Audit & Compliance)
//
// These server actions let supervisors formally sign off on daily reports.
// Only supervisor and admin roles can sign off — auditors and nurses are blocked.
// Every sign-off is written to audit_logs for full traceability.

import { requireWriteRole, requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { logger } from '@/shared/config/logger'
import { getSignOffForReport, createSignOff } from '../lib/signoff-queries'
import type { SignOffResult, ReportSignOff } from '../types/report.types'

// ---------------------------------------------------------------------------
// signOffReport — create or supersede a sign-off for a daily report
// ---------------------------------------------------------------------------

export interface SignOffParams {
    /** ISO date string YYYY-MM-DD identifying the report to sign off */
    reportDate: string
    /** Report category (default: 'daily') */
    reportType?: string
    /** Optional notes from the supervisor */
    notes?: string
}

/**
 * Sign off on a daily report.
 *
 * - Requires supervisor or admin role.
 * - Atomically supersedes any previous sign-off for the same date+type.
 * - Writes a REPORT_SIGNED_OFF entry to audit_logs.
 */
export async function signOffReport(params: SignOffParams): Promise<SignOffResult> {
    try {
        const session = await requireWriteRole(
            'reports',

            {
                actionType: 'REPORT_SIGNED_OFF',
                entityType: 'report',
                entityId: params.reportDate,
            }
        )

        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(params.reportDate)) {
            return { success: false, error: 'Invalid report date format (expected YYYY-MM-DD)' }
        }

        const reportType = params.reportType ?? 'daily'

        const signOff = await createSignOff({
            reportDate: params.reportDate,
            reportType,
            userId: session.userId,
            notes: params.notes ?? null,
        })

        await logAudit({
            actionType: 'REPORT_SIGNED_OFF',
            entityType: 'report',
            entityId: params.reportDate,
            performedBy: session.userId,
            reason: 'Supervisor signed off on daily report',
            metadata: {
                reportDate: params.reportDate,
                reportType,
                signOffId: signOff.id,
                notes: params.notes ?? null,
                username: session.username,
            },
        })

        logger.info('Report signed off', {
            signOffId: signOff.id,
            reportDate: params.reportDate,
            supervisorId: session.userId,
        })

        return { success: true, data: signOff }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to sign off report'
        logger.error('signOffReport failed', error as Error)
        return { success: false, error: message }
    }
}

// ---------------------------------------------------------------------------
// getReportSignOff — fetch the current active sign-off for a report
// ---------------------------------------------------------------------------

export interface GetSignOffParams {
    reportDate: string
    reportType?: string
}

/**
 * Fetch the current approved sign-off for a report date.
 * Accessible by supervisor, admin, and auditor roles (read-only).
 */
export async function getReportSignOff(
    params: GetSignOffParams
): Promise<{ success: boolean; data?: ReportSignOff | null; error?: string }> {
    try {
        await requireRole(['supervisor', 'admin', 'auditor'])

        const signOff = await getSignOffForReport(
            params.reportDate,
            params.reportType ?? 'daily'
        )

        return { success: true, data: signOff }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch sign-off'
        logger.error('getReportSignOff failed', error as Error)
        return { success: false, error: message }
    }
}
