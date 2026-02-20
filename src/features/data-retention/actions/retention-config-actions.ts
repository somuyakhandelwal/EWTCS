'use server'
// retention-config-actions.ts — server actions for US-14.2
// EPIC 14: Data Retention & Archival
//
// Admin-only write. Read access: admin + auditor (compliance officer).

import { requireRole } from '@/shared/lib/auth'
import { logger } from '@/shared/config/logger'
import { logAudit } from '@/shared/lib/audit'
import { getRetentionConfig, saveRetentionConfig } from '../lib/retention-config-queries'
import type { RetentionConfig } from '../lib/data-retention-types'

export interface FetchRetentionConfigResult {
  success: boolean
  data?: RetentionConfig
  error?: string
}

export interface SaveRetentionConfigResult {
  success: boolean
  error?: string
}

/** Fetch the current retention configuration. Accessible by admin and auditor. */
export async function fetchRetentionConfig(): Promise<FetchRetentionConfigResult> {
  try {
    await requireRole(['admin', 'auditor'])

    const data = await getRetentionConfig()
    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch retention config'
    logger.error('fetchRetentionConfig failed', error as Error)
    return { success: false, error: message }
  }
}

/**
 * Persist updated retention configuration. Admin only.
 * Validates that all period values are positive integers ≤ 99 years.
 */
export async function updateRetentionConfig(
  config: RetentionConfig,
): Promise<SaveRetentionConfigResult> {
  try {
    const session = await requireRole('admin')

    const yearFields: Array<keyof RetentionConfig> = [
      'patientAdmissionsYears',
      'auditLogsYears',
      'bedStageLogYears',
    ]

    for (const field of yearFields) {
      const val = config[field] as number
      if (!Number.isInteger(val) || val < 1 || val > 99) {
        return {
          success: false,
          error: `${field} must be a whole number between 1 and 99`,
        }
      }
    }

    await saveRetentionConfig(config)

    await logAudit({
      actionType: 'UPDATE',
      entityType: 'retention_config',
      entityId: 'system',
      performedBy: session.userId,
      changes: { ...config },
    })

    logger.info('Retention config updated', { adminId: session.userId, ...config })

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save retention config'
    logger.error('updateRetentionConfig failed', error as Error)
    return { success: false, error: message }
  }
}
