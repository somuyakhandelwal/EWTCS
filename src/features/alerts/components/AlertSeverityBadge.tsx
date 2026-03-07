// Alert Severity Badge
// EPIC 15: Notifications & Alerts (US-15.4)

import { cn } from '@/shared/lib/utils'
import type { AlertSeverity, AlertType } from '../types/alert'
import { ALERT_TYPE_LABELS, ALERT_SEVERITY_LABELS } from '../types/alert'

interface AlertSeverityBadgeProps {
  severity: AlertSeverity
  type: AlertType
  className?: string
}

const SEVERITY_CLASSES: Record<AlertSeverity, string> = {
  critical: 'bg-red-900/40 text-red-300 border border-red-700/60',
  warning:  'bg-amber-900/40 text-amber-300 border border-amber-700/60',
}

const SEVERITY_DOT: Record<AlertSeverity, string> = {
  critical: 'bg-red-400 motion-safe:animate-pulse',
  warning:  'bg-amber-400',
}

export function AlertSeverityBadge({ severity, type, className }: AlertSeverityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        SEVERITY_CLASSES[severity],
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', SEVERITY_DOT[severity])} />
      {ALERT_SEVERITY_LABELS[severity]} · {ALERT_TYPE_LABELS[type]}
    </span>
  )
}
