// Alert Types
// EPIC 15: Notifications & Alerts (US-15.4)

export type AlertType = 'delayed_bed' | 'disposition_bottleneck'

export type AlertSeverity = 'critical' | 'warning'

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  delayed_bed: 'Delayed Bed',
  disposition_bottleneck: 'Disposition Bottleneck',
}

export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  critical: 'Critical',
  warning: 'Warning',
}

/** Severity sort order — critical sorts before warning */
export const ALERT_SEVERITY_ORDER: Record<AlertSeverity, number> = {
  critical: 0,
  warning: 1,
}

export interface Alert {
  /** Composite key used as DB alert_key: '{type}:{bedId}' */
  id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  description: string
  bedId: string
  bedNumber: string
  /** ms elapsed — total stay for delayed_bed; disposition time for bottleneck */
  elapsedTimeMs: number
  isAcknowledged: boolean
  acknowledgedAt: Date | null
  /** username of the supervisor who acknowledged */
  acknowledgedBy: string | null
  /** when the acknowledgment expires */
  acknowledgedUntil: Date | null
  /** approximate time the alert condition began */
  startedAt: Date
}

export interface AlertAcknowledgment {
  id: string
  alertType: AlertType
  alertKey: string
  bedId: string | null
  acknowledgedByUserId: string
  acknowledgedByUsername: string
  acknowledgedAt: Date
  expiresAt: Date
  notes: string | null
}

export type AlertSortField = 'severity' | 'elapsed' | 'type'
export type AlertSortDirection = 'asc' | 'desc'

export interface AlertScreenFilters {
  sortBy: AlertSortField
  sortDir: AlertSortDirection
  showAcknowledged: boolean
}
