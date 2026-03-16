'use server'

// US-15.4: Supervisor Alert Screen server actions.
// Builder helpers live in alert-builders.ts to respect the 200-line limit.

import { logger } from '@/shared/config/logger'
import { requireRole } from '@/shared/lib/auth'
import { getBedGridData } from '@/features/bed-dashboard/actions/bed-grid-actions'
import { readAlertPreferences } from '@/features/notifications/lib/alert-preferences-queries'
import { DEFAULT_ALERT_PREFERENCES } from '@/features/notifications/lib/default-alert-preferences'
import { getRecentErrors, acknowledgeError } from '@/lib/server/error-store'
import type { AlertItem } from '@/features/notifications/types/alert-item'
import { buildBedAlerts, buildErrorAlerts, sortAlerts } from './alert-builders'

export interface AlertScreenData {
  alerts: AlertItem[]
  /** UTC ISO string of when this snapshot was generated */
  fetchedAt: string
  /** Total unacknowledged count for the badge */
  unacknowledgedCount: number
}

// ─── Public action: fetch alert screen data ───────────────────────────────────

export async function getAlertScreenData(): Promise<{
  success: boolean
  data?: AlertScreenData
  error?: string
}> {
  try {
    const session = await requireRole(['supervisor', 'admin'])

    const [bedResult, savedPrefs, recentErrors] = await Promise.all([
      getBedGridData(),
      readAlertPreferences(session.userId),
      getRecentErrors(50),
    ])

    const prefs = savedPrefs ?? DEFAULT_ALERT_PREFERENCES

    if (!bedResult.success || !bedResult.data) {
      return { success: false, error: bedResult.error ?? 'Failed to load bed data' }
    }

    const bedAlerts = buildBedAlerts(bedResult.data, prefs)
    const errorAlerts = buildErrorAlerts(recentErrors, prefs.enabledAlertTypes.systemErrors)
    const allAlerts = sortAlerts([...bedAlerts, ...errorAlerts])
    const unacknowledgedCount = allAlerts.filter(a => !a.acknowledged).length

    return {
      success: true,
      data: { alerts: allAlerts, fetchedAt: new Date().toISOString(), unacknowledgedCount },
    }
  } catch (error) {
    logger.error('getAlertScreenData failed', error as Error)
    return { success: false, error: 'Failed to load alert screen data' }
  }
}

// ─── Public action: acknowledge a system error alert ─────────────────────────

export async function acknowledgeSystemAlert(errorEventId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    await requireRole(['supervisor', 'admin'])
    const ok = await acknowledgeError(errorEventId)
    if (!ok) return { success: false, error: 'Alert not found or already acknowledged' }
    return { success: true }
  } catch (error) {
    logger.error('acknowledgeSystemAlert failed', error as Error)
    return { success: false, error: 'Failed to acknowledge alert' }
  }
}

// ─── Public action: unacknowledged count for nav badge ────────────────────────

export async function getUnacknowledgedAlertCount(): Promise<{
  success: boolean
  count?: number
  error?: string
}> {
  try {
    const session = await requireRole(['supervisor', 'admin'])

    const [bedResult, savedPrefs, recentErrors] = await Promise.all([
      getBedGridData(),
      readAlertPreferences(session.userId),
      getRecentErrors(50),
    ])

    const prefs = savedPrefs ?? DEFAULT_ALERT_PREFERENCES
    let count = 0

    if (bedResult.success && bedResult.data) {
      const userDelayMs = prefs.thresholds.delayMinutes * 60 * 1000
      const userEscalationMs = prefs.thresholds.escalationMinutes * 60 * 1000
      for (const bed of bedResult.data.beds) {
        const elapsed = bed.elapsedTimeMs ?? 0
        if (
          (prefs.enabledAlertTypes.escalations && elapsed >= userEscalationMs) ||
          (prefs.enabledAlertTypes.delayedBeds && elapsed >= userDelayMs) ||
          (prefs.enabledAlertTypes.dispositionBottlenecks && bed.isDispositionBottleneck)
        ) count++
      }
    }

    if (prefs.enabledAlertTypes.systemErrors) {
      count += recentErrors.filter(
        e => !e.acknowledged && (e.level === 'ERROR' || e.level === 'CRITICAL')
      ).length
    }

    return { success: true, count }
  } catch (error) {
    logger.error('getUnacknowledgedAlertCount failed', error as Error)
    return { success: false, error: 'Failed to get alert count' }
  }
}
