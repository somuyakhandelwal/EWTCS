// US-15.4: Unified AlertItem union type for the Supervisor Alert Screen.
// Represents one entry in the combined alert feed (delayed bed, escalation,
// disposition bottleneck, or system error).

export type AlertSeverity = 'critical' | 'error' | 'escalation' | 'delay'

export type AlertItemKind =
  | 'delayed_bed'
  | 'escalation'
  | 'bottleneck'
  | 'system_error'

interface BaseAlertItem {
  /** Globally unique identifier for the alert (used as React key and ack target) */
  id: string
  /** Severity rank — used for default sort order */
  severity: AlertSeverity
  kind: AlertItemKind
  title: string
  description: string
  /** ISO timestamp string — used for "time ago" display and secondary sort */
  timestamp: string
  /** Whether the alert has been acknowledged by the current supervisor */
  acknowledged: boolean
}

export interface DelayedBedAlertItem extends BaseAlertItem {
  kind: 'delayed_bed'
  severity: 'delay'
  bedId: string
  bedNumber: string
  stageName: string | null
  elapsedTimeMs: number
}

export interface EscalationAlertItem extends BaseAlertItem {
  kind: 'escalation'
  severity: 'escalation'
  bedId: string
  bedNumber: string
  stageName: string | null
  elapsedTimeMs: number
}

export interface BottleneckAlertItem extends BaseAlertItem {
  kind: 'bottleneck'
  severity: 'delay'
  bedId: string
  bedNumber: string
  stageName: string | null
  dispositionElapsedMs: number | null
}

export interface SystemErrorAlertItem extends BaseAlertItem {
  kind: 'system_error'
  severity: 'critical' | 'error'
  /** Original error_events row id — used to call acknowledge API */
  errorEventId: string
  category: string
}

export type AlertItem =
  | DelayedBedAlertItem
  | EscalationAlertItem
  | BottleneckAlertItem
  | SystemErrorAlertItem

/** Numeric rank for sorting — lower = more severe */
export const SEVERITY_RANK: Record<AlertSeverity, number> = {
  critical: 0,
  error: 1,
  escalation: 2,
  delay: 3,
}
