// Alert Server Actions
// EPIC 15: Notifications & Alerts (US-15.4, US-15.5)
// Purpose: Server actions consumed by the alert screen client components.

'use server'

import { requireRole } from '@/shared/lib/auth'
import { logAudit } from '@/shared/lib/audit'
import { logger } from '@/shared/config/logger'
import { getActiveAlerts } from '../lib/alert-queries'
import { upsertAcknowledgment } from '../lib/alert-mutations'
import { acknowledgeAlertSchema } from '../schemas/alert-schemas'
import { getUserPreferenceMap } from '@/features/notifications/lib/notification-preference-queries'
import type { AcknowledgeAlertInput } from '../schemas/alert-schemas'
import type { Alert } from '../types/alert'

/**
 * Fetch alerts for the current user, filtered by their notification preferences.
 * Alert types that the user has disabled are excluded entirely.
 * A custom minDelayThresholdMinutes overrides the global threshold for that type.
 * Called on every polling interval from the client hook.
 */
export async function getAlertsAction(): Promise<{
  success: boolean
  alerts?: Alert[]
  error?: string
}> {
  try {
    const session = await requireRole(['supervisor', 'admin'])

    const [allAlerts, preferences] = await Promise.all([
      getActiveAlerts(),
      getUserPreferenceMap(session.userId),
    ])

    const alerts = allAlerts.filter((alert) => {
      const pref = preferences[alert.type]
      if (!pref.enabled) return false
      if (pref.minDelayThresholdMinutes !== null) {
        const minMs = pref.minDelayThresholdMinutes * 60 * 1000
        if (alert.elapsedTimeMs < minMs) return false
      }
      return true
    })

    logger.info('Alerts fetched', {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === 'critical').length,
      warning: alerts.filter((a) => a.severity === 'warning').length,
      acknowledged: alerts.filter((a) => a.isAcknowledged).length,
    })

    return { success: true, alerts }
  } catch (error) {
    logger.error('Failed to fetch alerts', error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch alerts',
    }
  }
}

/**
 * Acknowledge an alert — suppresses it until the expiry time chosen by the supervisor.
 * Uses UPSERT so re-acknowledging an alert just extends/updates the record.
 */
export async function acknowledgeAlertAction(
  rawInput: AcknowledgeAlertInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireRole(['supervisor', 'admin'])

    const parsed = acknowledgeAlertSchema.safeParse(rawInput)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      const firstError = Object.values(fieldErrors).flat()[0] ?? 'Invalid input'
      return { success: false, error: firstError }
    }

    const input = parsed.data

    await upsertAcknowledgment(input, session.userId)

    await logAudit({
      actionType: 'ACKNOWLEDGE',
      entityType: 'alert',
      entityId: input.alertKey,
      performedBy: session.userId,
      changes: {
        alertType: input.alertType,
        alertKey: input.alertKey,
        bedId: input.bedId,
        expiryHours: input.expiryHours,
      },
      reason: input.notes,
    })

    logger.info('Alert acknowledged', {
      alertKey: input.alertKey,
      acknowledgedBy: session.username,
      expiryHours: input.expiryHours,
    })

    return { success: true }
  } catch (error) {
    logger.error('Failed to acknowledge alert', error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to acknowledge alert',
    }
  }
}
