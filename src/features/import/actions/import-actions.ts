'use server'

import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { logger } from '@/shared/config/logger'
import { processHistoricalImport } from '../lib/import-service'
import { HistoricalAdmissionSchema, type ImportResult } from '../types/import.types'

/**
 * Server action to import historical admissions.
 * Expects an array of parsed CSV rows.
 */
export async function importHistoricalDataAction(
    rows: any[]
): Promise<{ success: boolean; result?: ImportResult; error?: string }> {
    try {
        // 1. Auth Guard
        const session = await requireRole(['admin', 'supervisor'])

        logger.info(`[import] Starting import of ${rows.length} rows, triggered by ${session.userId}`)

        // 2. Pre-validate rows to filter out obvious garbage before passing to service
        const admissionsToProcess = []
        const results: ImportResult = { successCount: 0, failureCount: 0, errors: [] }

        for (let i = 0; i < rows.length; i++) {
            const parsed = HistoricalAdmissionSchema.safeParse(rows[i])
            if (parsed.success) {
                admissionsToProcess.push(parsed.data)
            } else {
                results.failureCount++
                results.errors.push({
                    row: i + 1,
                    error: parsed.error.issues[0]?.message ?? 'Invalid data format'
                })
            }
        }

        // 3. Process valid rows
        const processResult = await processHistoricalImport(admissionsToProcess)

        // Combine results
        results.successCount = processResult.successCount
        results.failureCount += processResult.failureCount
        results.errors.push(...processResult.errors)

        // 4. Audit Log
        await logAudit({
            actionType: 'HISTORICAL_DATA_IMPORT',
            entityType: 'patient_admissions',
            entityId: 'bulk-import',
            performedBy: session.userId,
            metadata: {
                successCount: results.successCount,
                failureCount: results.failureCount,
                totalAttempted: rows.length
            }
        })

        return { success: true, result: results }

    } catch (error: any) {
        logger.error('[import] Action failed', error)
        return { success: false, error: error.message || 'Import failed' }
    }
}
