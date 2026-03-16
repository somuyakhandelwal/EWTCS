// US-15.4: Pure helper functions that build AlertItem arrays from raw data.
// Kept separate from the server actions to respect the 200-line limit.

import { getBedGridData } from '@/features/bed-dashboard/actions/bed-grid-actions'
import { getRecentErrors } from '@/lib/server/error-store'
import type { AlertPreferences } from '@/features/notifications/types/alert-preferences'
import type {
  AlertItem,
  DelayedBedAlertItem,
  EscalationAlertItem,
  BottleneckAlertItem,
  SystemErrorAlertItem,
} from '@/features/notifications/types/alert-item'
import { SEVERITY_RANK } from '@/features/notifications/types/alert-item'
import { formatDuration } from '@/shared/lib/duration-formatters'

// ─── Build bed-derived alerts ────────────────────────────────────────────────

export function buildBedAlerts(
  beds: Awaited<ReturnType<typeof getBedGridData>>['data'],
  prefs: AlertPreferences,
): AlertItem[] {
  if (!beds) return []

  const userDelayMs = prefs.thresholds.delayMinutes * 60 * 1000
  const userEscalationMs = prefs.thresholds.escalationMinutes * 60 * 1000
  const userBottleneckCount = prefs.thresholds.bottleneckCount
  const items: AlertItem[] = []

  for (const bed of beds.beds) {
    const elapsed = bed.elapsedTimeMs ?? 0
    const stageName = bed.currentStage?.name ?? null

    if (prefs.enabledAlertTypes.escalations && elapsed >= userEscalationMs) {
      const item: EscalationAlertItem = {
        id: `escalation-${bed.id}`,
        kind: 'escalation',
        severity: 'escalation',
        bedId: bed.id,
        bedNumber: bed.bedNumber,
        stageName,
        elapsedTimeMs: elapsed,
        title: `Bed ${bed.bedNumber} — Escalated`,
        description: stageName
          ? `Patient in "${stageName}" for ${formatDuration(elapsed)} (escalation threshold exceeded)`
          : `Patient unattended for ${formatDuration(elapsed)} (escalation threshold exceeded)`,
        timestamp: bed.lastStageChange?.toISOString() ?? new Date().toISOString(),
        acknowledged: false,
      }
      items.push(item)
      continue
    }

    if (prefs.enabledAlertTypes.delayedBeds && elapsed >= userDelayMs) {
      const item: DelayedBedAlertItem = {
        id: `delay-${bed.id}`,
        kind: 'delayed_bed',
        severity: 'delay',
        bedId: bed.id,
        bedNumber: bed.bedNumber,
        stageName,
        elapsedTimeMs: elapsed,
        title: `Bed ${bed.bedNumber} — Delayed`,
        description: stageName
          ? `Patient in "${stageName}" for ${formatDuration(elapsed)}`
          : `Patient unattended for ${formatDuration(elapsed)}`,
        timestamp: bed.lastStageChange?.toISOString() ?? new Date().toISOString(),
        acknowledged: false,
      }
      items.push(item)
    }
  }

  if (prefs.enabledAlertTypes.dispositionBottlenecks) {
    const bottlenecks = beds.beds.filter(b => b.isDispositionBottleneck)
    if (bottlenecks.length >= userBottleneckCount) {
      for (const bed of bottlenecks) {
        const alreadyAdded = items.some(
          i => (i.kind === 'escalation' || i.kind === 'delayed_bed') &&
               (i as EscalationAlertItem | DelayedBedAlertItem).bedId === bed.id
        )
        if (alreadyAdded) continue

        const item: BottleneckAlertItem = {
          id: `bottleneck-${bed.id}`,
          kind: 'bottleneck',
          severity: 'delay',
          bedId: bed.id,
          bedNumber: bed.bedNumber,
          stageName: bed.currentStage?.name ?? null,
          dispositionElapsedMs: bed.dispositionElapsedMs,
          title: `Bed ${bed.bedNumber} — Disposition Bottleneck`,
          description: bed.dispositionElapsedMs
            ? `Awaiting disposition for ${formatDuration(bed.dispositionElapsedMs)}`
            : 'Awaiting disposition decision',
          timestamp: bed.lastStageChange?.toISOString() ?? new Date().toISOString(),
          acknowledged: false,
        }
        items.push(item)
      }
    }
  }

  return items
}

// ─── Build system error alerts ───────────────────────────────────────────────

export function buildErrorAlerts(
  errors: Awaited<ReturnType<typeof getRecentErrors>>,
  showSystemErrors: boolean,
): SystemErrorAlertItem[] {
  if (!showSystemErrors) return []

  return errors
    .filter(e => !e.acknowledged && (e.level === 'ERROR' || e.level === 'CRITICAL'))
    .map(
      (e): SystemErrorAlertItem => ({
        id: `syserr-${e.id}`,
        kind: 'system_error',
        severity: e.level === 'CRITICAL' ? 'critical' : 'error',
        errorEventId: e.id,
        category: e.category,
        title: `System ${e.level}: ${e.category}`,
        description: e.message,
        timestamp: e.created_at,
        acknowledged: e.acknowledged,
      })
    )
}

// ─── Sort ────────────────────────────────────────────────────────────────────

export function sortAlerts(alerts: AlertItem[]): AlertItem[] {
  return [...alerts].sort((a, b) => {
    const diff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
    if (diff !== 0) return diff
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })
}
