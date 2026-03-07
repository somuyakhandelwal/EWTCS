'use server'
// US-17.7: PII enforcement helper for bed stage update
// Checks free-text fields and rejects submissions containing patient information

import { detectPii, redactPii } from '@/shared/lib/pii-detector'
import { logAudit } from '@/shared/lib/audit'
import { logger } from '@/shared/config/logger'

interface PiiField {
    field: string
    value: string | undefined
}

interface PiiGuardOk { hasPii: false }
interface PiiGuardBlocked { hasPii: true; error: string }

export async function checkBedUpdatePii(
    fields: PiiField[],
    bedId: string,
    userId: string,
): Promise<PiiGuardOk | PiiGuardBlocked> {
    for (const { field, value } of fields) {
        if (!value) continue
        const pii = detectPii(value)
        if (!pii.hasPii) continue

        await logAudit({
            actionType: 'PII_BLOCKED',
            entityType: 'bed',
            entityId: bedId,
            performedBy: userId,
            metadata: {
                field,
                detectedCategories: pii.summary,
                redactedValue: redactPii(value),
            },
        })
        logger.warn('PII detected and blocked in bed stage update', {
            userId,
            bedId,
            field,
            categories: pii.summary,
        })
        return {
            hasPii: true,
            error: `Field "${field}" contains patient information (${pii.summary}). Remove it before submitting.`,
        }
    }
    return { hasPii: false }
}
