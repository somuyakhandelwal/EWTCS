'use server'
// Report Sign-Off Actions
// US-12.4: Supervisor sign-off on management reports

import 'server-only'
import { z } from 'zod'
import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { getSignOffForDate, createSignOff, type SignOff } from '../lib/sign-off-queries'
import { piiRefine } from '@/shared/lib/pii'

export interface SignOffResult {
    success: boolean
    signOff?: SignOff
    error?: string
}

/** Fetch the active sign-off for a given report date. */
export async function getSignOffAction(reportDate: string): Promise<SignOffResult> {
    try {
        await requireRole(['admin', 'supervisor'])
    } catch {
        return { success: false, error: 'Unauthorized' }
    }
    try {
        const signOff = await getSignOffForDate(reportDate)
        return { success: true, signOff: signOff ?? undefined }
    } catch {
        return { success: false, error: 'Failed to fetch sign-off status' }
    }
}

const CreateSignOffSchema = z.object({
    reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
    // US-17.6/17.8: PII blocked from sign-off notes
    notes: z.string().max(1000).optional().superRefine((val, ctx) => {
        if (val) piiRefine(val, ctx)
    }),
})

/** Create (or supersede) a sign-off for a report date. Supervisors and admins only. */
export async function createSignOffAction(
    input: z.input<typeof CreateSignOffSchema>
): Promise<SignOffResult> {
    let session
    try {
        session = await requireRole(['admin', 'supervisor'])
    } catch {
        return { success: false, error: 'Unauthorized' }
    }

    const parsed = CreateSignOffSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: 'Invalid input' }

    try {
        const signOff = await createSignOff(
            parsed.data.reportDate,
            session.userId as string,
            parsed.data.notes
        )
        await logAudit({
            actionType: 'CREATE',
            entityType: 'report_sign_off',
            entityId: signOff.id,
            performedBy: session.userId as string,
            changes: {
                report_date: parsed.data.reportDate,
                notes: parsed.data.notes ?? null,
            },
        })
        return { success: true, signOff }
    } catch {
        return { success: false, error: 'Failed to create sign-off' }
    }
}
