'use server'

/**
 * EPIC 7: Error Handling & Correction — Read Actions
 * getCorrectionsForLog, getCorrectedLogIds, getCorrectedStageMap
 * Split from write actions to keep each file under 200 lines.
 */

import { requireRole } from '@/shared/lib/auth'
import { logger } from '@/shared/config/logger'
import {
  fetchCorrectionsForLog,
  fetchCorrectedLogIds,
  fetchCorrectedStageMap,
  fetchCorrectionAuditTrail,
} from '../lib/stage-history-correction-queries'
import {
  type HistoryCorrection,
  type CorrectionAuditFilters,
  type CorrectionAuditRecord,
} from '../types/corrections'
import { generateCorrectionAuditCSV } from '../lib/csv-generators'

export type ReadResult<T> = { success: true; data: T } | { success: false; error: string }

/**
 * Return the full correction trail for a single bed_stage_log record.
 * Accessible to supervisors, admins, and auditors.
 */
export async function getCorrectionsForLog(
  bedStageLogId: string
): Promise<ReadResult<HistoryCorrection[]>> {
  try {
    await requireRole(['supervisor', 'admin', 'auditor'])
    if (!bedStageLogId?.trim()) return { success: false, error: 'Invalid log record ID.' }
    const data = await fetchCorrectionsForLog(bedStageLogId)
    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch corrections'
    logger.error('getCorrectionsForLog failed', error as Error)
    return { success: false, error: message }
  }
}

/**
 * Returns an array of bed_stage_log IDs that have ≥1 correction.
 * Used by AuditorHistoryView to render "Corrected" badges in a single query.
 */
export async function getCorrectedLogIds(): Promise<ReadResult<string[]>> {
  try {
    await requireRole(['supervisor', 'admin', 'auditor'])
    const idSet = await fetchCorrectedLogIds()
    return { success: true, data: Array.from(idSet) }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch corrected IDs'
    logger.error('getCorrectedLogIds failed', error as Error)
    return { success: false, error: message }
  }
}

/**
 * Returns a plain object map of logId → corrected stage name.
 * Used by AuditorHistoryTable to show the corrected stage in the "To" column.
 * Serialisable (plain object) so it can be passed from server action to client.
 */
export async function getCorrectedStageMap(): Promise<ReadResult<Record<string, string>>> {
  try {
    await requireRole(['supervisor', 'admin', 'auditor'])
    const map = await fetchCorrectedStageMap()
    return { success: true, data: Object.fromEntries(map) }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch corrected stage map'
    logger.error('getCorrectedStageMap failed', error as Error)
    return { success: false, error: message }
  }
}

/**
 * Search the global correction audit trail with filters.
 * Accessible to supervisors, admins, and auditors.
 */
export async function searchCorrectionAuditTrail(
  filters: CorrectionAuditFilters
): Promise<ReadResult<CorrectionAuditRecord[]>> {
  try {
    const session = await requireRole(['supervisor', 'admin', 'auditor'])
    const data = await fetchCorrectionAuditTrail(filters)

    logger.info('Searched correction audit trail', {
      userId: session.userId,
      filterCount: Object.keys(filters).length,
      resultCount: data.length,
    })

    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to search audit trail'
    logger.error('searchCorrectionAuditTrail failed', error as Error)
    return { success: false, error: message }
  }
}

/**
 * Export the filtered global correction audit trail to CSV.
 * Accessible to supervisors, admins, and auditors.
 */
export async function exportCorrectionAuditTrail(
  filters: CorrectionAuditFilters
): Promise<ReadResult<string>> {
  try {
    const session = await requireRole(['supervisor', 'admin', 'auditor'])
    const data = await fetchCorrectionAuditTrail(filters)

    logger.info('Exported correction audit trail', {
      userId: session.userId,
      resultCount: data.length,
    })

    const csv = generateCorrectionAuditCSV(data)
    return { success: true, data: csv }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export audit trail'
    logger.error('exportCorrectionAuditTrail failed', error as Error)
    return { success: false, error: message }
  }
}
