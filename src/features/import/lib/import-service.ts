import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import { HistoricalAdmissionSchema, type HistoricalAdmission, type ImportResult } from '../types/import.types'

/**
 * Maps bed numbers and usernames to IDs and batch inserts into patient_admissions.
 */
export async function processHistoricalImport(
    admissions: HistoricalAdmission[]
): Promise<ImportResult> {
    const result: ImportResult = { successCount: 0, failureCount: 0, errors: [] }

    try {
        // 1. Pre-fetch Bed and User mappings for speed
        const [bedRes, userRes] = await Promise.all([
            query<{ id: string; bed_number: string }>('SELECT id, bed_number FROM beds'),
            query<{ id: string; username: string }>('SELECT id, username FROM users'),
        ])

        const bedMap = new Map(bedRes.rows.map(b => [b.bed_number, b.id]))
        const userMap = new Map(userRes.rows.map(u => [u.username, u.id]))

        // 2. Process each row
        for (let i = 0; i < admissions.length; i++) {
            const row = admissions[i]
            const rowIndex = i + 1 // 1-indexed for reporting

            try {
                // Validate schema again just in case
                const validated = HistoricalAdmissionSchema.parse(row)

                const bedId = bedMap.get(validated.bed_number)
                if (!bedId) {
                    throw new Error(`Bed number "${validated.bed_number}" not found`)
                }

                const userId = userMap.get(validated.discharged_by_username)
                if (!userId) {
                    throw new Error(`User "${validated.discharged_by_username}" not found`)
                }

                const admitDate = new Date(validated.admitted_at)
                const dischargeDate = new Date(validated.discharged_at)
                const durationMs = dischargeDate.getTime() - admitDate.getTime()

                // 3. Deduplication: Check if this record already exists
                // We check for bed_id and admitted_at as a unique combination for a stay start.
                const existingCheck = await query(
                    'SELECT 1 FROM patient_admissions WHERE bed_id = $1 AND admitted_at = $2 LIMIT 1',
                    [bedId, admitDate]
                )

                if (existingCheck.rowCount && existingCheck.rowCount > 0) {
                    throw new Error(`Duplicate entry: patient stay at ${validated.bed_number} starting ${validated.admitted_at} already exists`)
                }

                // 4. Insert into patient_admissions
                const sql = `
                INSERT INTO patient_admissions (
                    bed_id,
                    admitted_at,
                    discharged_at,
                    total_duration_ms,
                    discharged_by_user_id,
                    notes
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `
                await query(sql, [
                    bedId,
                    admitDate,
                    dischargeDate,
                    durationMs,
                    userId,
                    validated.notes ?? null,
                ])

                result.successCount++
            } catch (error: any) {
                result.failureCount++
                result.errors.push({
                    row: rowIndex,
                    error: error.message || 'Unknown processing error',
                    data: row
                })
                logger.warn(`[import] Failed to process row ${rowIndex}: ${error.message}`)
            }
        }

        logger.info(`[import] Completed: ${result.successCount} success, ${result.failureCount} failed`)
        return result

    } catch (error: any) {
        logger.error('[import] Fatal error during import process', error)
        throw new Error('Import process failed at a systemic level')
    }
}
