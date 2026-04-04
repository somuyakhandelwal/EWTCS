import { logger } from '@/shared/config/logger'
import { logAudit } from '@/shared/lib/audit'
import { detectPii, redactPii } from '@/shared/lib/pii-detector'

/**
 * Validate free-text fields for PII (US-17.7)
 * Returns error message if PII detected, null otherwise.
 * 
 * @param bedId - The ID of the bed being updated
 * @param userId - The ID of the user performing the update
 * @param fields - Array of field names and their values to check
 * @returns Error message string if PII is found, null otherwise
 */
export async function validatePii(
  bedId: string,
  userId: string,
  fields: Array<{ field: string; value: string | undefined }>
): Promise<string | null> {
  for (const { field, value } of fields) {
    if (!value) continue
    const pii = detectPii(value)
    if (pii.hasPii) {
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
      return `Field "${field}" contains patient information (${pii.summary}). Remove it before submitting.`
    }
  }
  return null
}
