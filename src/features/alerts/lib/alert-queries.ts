// Alert Queries
// EPIC 15: Notifications & Alerts (US-15.4)
// Purpose: Read active alerts by joining live bed data with acknowledgment records.

import 'server-only'

import { query } from '@/shared/lib/db'
import { getBedsWithElapsedTime } from '@/features/bed-dashboard/lib/bed-bottleneck-queries'
import { config } from '@/shared/config/env'
import { DISPOSITION_DELAY_REASON_LABELS } from '@/features/bed-dashboard/types/bed'
import { formatElapsedTime } from '@/features/bed-dashboard/lib/utils'
import type { Alert, AlertAcknowledgment } from '../types/alert'

/**
 * Critical threshold: 2× the configured delay threshold.
 * Default: 2 × 3 h = 6 h → bed is critical.
 */
const CRITICAL_ELAPSED_MULTIPLIER = 2

/**
 * Disposition bottleneck escalates to critical after 60 min in Decision Made.
 */
const CRITICAL_BOTTLENECK_MS = 60 * 60 * 1000

/**
 * Surface error_events from the past 24 hours only.
 */
const SYSTEM_ERROR_WINDOW_MS = 24 * 60 * 60 * 1000

interface ErrorEventRow {
  id: string
  level: 'ERROR' | 'CRITICAL'
  category: string
  message: string
  createdAt: Date
}

async function getRecentErrorEvents(): Promise<ErrorEventRow[]> {
  const since = new Date(Date.now() - SYSTEM_ERROR_WINDOW_MS)
  const result = await query<ErrorEventRow>(
    `SELECT id, level, category, message, created_at AS "createdAt"
     FROM   error_events
     WHERE  acknowledged = FALSE
       AND  level IN ('ERROR', 'CRITICAL')
       AND  created_at > $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [since]
  )
  return result.rows
}

/**
 * Build the full list of active alerts derived from live bed state.
 * Each delayed or bottleneck bed produces one alert.
 * Acknowledgment data is joined in-memory from the acks map.
 */
export async function getActiveAlerts(): Promise<Alert[]> {
  const delayThresholdMs = config.alert.delayThresholdMs
  const criticalThresholdMs = delayThresholdMs * CRITICAL_ELAPSED_MULTIPLIER

  const [beds, acks, errorEvents] = await Promise.all([
    getBedsWithElapsedTime(delayThresholdMs, criticalThresholdMs),
    getActiveAcknowledgments(),
    getRecentErrorEvents(),
  ])

  const ackMap = new Map<string, AlertAcknowledgment>(
    acks.map((a) => [a.alertKey, a])
  )

  const alerts: Alert[] = []

  for (const bed of beds) {
    // ── Delayed-bed alert ──────────────────────────────────────────────────
    if (bed.isDelayed && bed.elapsedTimeMs !== null) {
      const alertKey = `delayed_bed:${bed.id}`
      const ack = ackMap.get(alertKey) ?? null

      alerts.push({
        id: alertKey,
        type: 'delayed_bed',
        severity: bed.elapsedTimeMs >= criticalThresholdMs ? 'critical' : 'warning',
        title: `Bed ${bed.bedNumber} — Extended Wait`,
        description: `Patient in ${bed.currentStage?.name ?? 'Unknown'} for ${formatElapsedTime(bed.elapsedTimeMs)}`,
        bedId: bed.id,
        bedNumber: bed.bedNumber,
        elapsedTimeMs: bed.elapsedTimeMs,
        isAcknowledged: ack !== null,
        acknowledgedAt: ack?.acknowledgedAt ?? null,
        acknowledgedBy: ack?.acknowledgedByUsername ?? null,
        acknowledgedUntil: ack?.expiresAt ?? null,
        startedAt: bed.patientStartTime ?? new Date(),
      })
    }

    // ── Disposition-bottleneck alert ───────────────────────────────────────
    if (bed.isDispositionBottleneck && bed.dispositionElapsedMs !== null) {
      const alertKey = `disposition_bottleneck:${bed.id}`
      const ack = ackMap.get(alertKey) ?? null
      const reasonLabel = bed.dispositionDelayReason
        ? DISPOSITION_DELAY_REASON_LABELS[bed.dispositionDelayReason]
        : null

      alerts.push({
        id: alertKey,
        type: 'disposition_bottleneck',
        severity:
          bed.dispositionElapsedMs >= CRITICAL_BOTTLENECK_MS ? 'critical' : 'warning',
        title: `Bed ${bed.bedNumber} — Disposition Bottleneck`,
        description: `Awaiting disposition for ${formatElapsedTime(bed.dispositionElapsedMs)}${reasonLabel ? ` — ${reasonLabel}` : ''}`,
        bedId: bed.id,
        bedNumber: bed.bedNumber,
        elapsedTimeMs: bed.dispositionElapsedMs,
        isAcknowledged: ack !== null,
        acknowledgedAt: ack?.acknowledgedAt ?? null,
        acknowledgedBy: ack?.acknowledgedByUsername ?? null,
        acknowledgedUntil: ack?.expiresAt ?? null,
        startedAt: bed.lastStageChange ?? new Date(),
      })
    }
  }

  // ── System-error alerts ────────────────────────────────────────────────
  for (const ev of errorEvents) {
    const alertKey = `system_error:${ev.id}`
    const ack = ackMap.get(alertKey) ?? null
    const elapsedMs = Date.now() - new Date(ev.createdAt).getTime()

    alerts.push({
      id: alertKey,
      type: 'system_error',
      severity: ev.level === 'CRITICAL' ? 'critical' : 'warning',
      title: `System Error — ${ev.category}`,
      description: ev.message,
      bedId: null,
      bedNumber: ev.category,
      elapsedTimeMs: elapsedMs,
      isAcknowledged: ack !== null,
      acknowledgedAt: ack?.acknowledgedAt ?? null,
      acknowledgedBy: ack?.acknowledgedByUsername ?? null,
      acknowledgedUntil: ack?.expiresAt ?? null,
      startedAt: new Date(ev.createdAt),
    })
  }

  return alerts
}

/**
 * Fetch all active (non-expired) acknowledgment rows, joined with the
 * acknowledging user's username.
 */
export async function getActiveAcknowledgments(): Promise<AlertAcknowledgment[]> {
  const result = await query<{
    id: string
    alertType: string
    alertKey: string
    bedId: string | null
    acknowledgedByUserId: string
    acknowledgedByUsername: string
    acknowledgedAt: Date
    expiresAt: Date
    notes: string | null
  }>(
    `SELECT
       aa.id,
       aa.alert_type              AS "alertType",
       aa.alert_key               AS "alertKey",
       aa.bed_id                  AS "bedId",
       aa.acknowledged_by_user_id AS "acknowledgedByUserId",
       u.username                 AS "acknowledgedByUsername",
       aa.acknowledged_at         AS "acknowledgedAt",
       aa.expires_at              AS "expiresAt",
       aa.notes
     FROM alert_acknowledgments aa
     JOIN users u ON aa.acknowledged_by_user_id = u.id
     WHERE aa.expires_at > NOW()
     ORDER BY aa.acknowledged_at DESC`
  )

  return result.rows as AlertAcknowledgment[]
}
