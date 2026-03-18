// AlertScreen config: severity visuals, labels, badges, time-ago
import { ShieldAlert, AlertCircle, AlertTriangle, BedDouble, Clock } from 'lucide-react'
import type { AlertSeverity, AlertItemKind } from '@/features/notifications/types/alert-item'
import { formatDuration } from '@/shared/lib/duration-formatters'

export const SEVERITY_CONFIG: Record<
  AlertSeverity,
  { label: string; rowClass: string; badgeClass: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  critical: {
    label: 'CRITICAL',
    rowClass: 'border-purple-700/60 bg-purple-900/20',
    badgeClass: 'bg-purple-900/50 text-purple-300 border border-purple-700',
    Icon: ShieldAlert,
  },
  error: {
    label: 'ERROR',
    rowClass: 'border-red-700/60 bg-red-900/20',
    badgeClass: 'bg-red-900/50 text-red-300 border border-red-700',
    Icon: AlertCircle,
  },
  escalation: {
    label: 'ESCALATED',
    rowClass: 'border-orange-700/60 bg-orange-900/20',
    badgeClass: 'bg-orange-900/50 text-orange-300 border border-orange-700',
    Icon: AlertTriangle,
  },
  delay: {
    label: 'DELAYED',
    rowClass: 'border-yellow-700/60 bg-yellow-900/20',
    badgeClass: 'bg-yellow-900/60 text-yellow-300 border border-yellow-700',
    Icon: BedDouble,
  },
}

export const KIND_LABELS: Record<AlertItemKind, string> = {
  delayed_bed: 'Delayed Bed',
  escalation: 'Escalation',
  bottleneck: 'Bottleneck',
  system_error: 'System Error',
}

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const cfg = SEVERITY_CONFIG[severity]
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold ${cfg.badgeClass}`}>
      <cfg.Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  )
}

export function TimeAgo({ timestamp }: { timestamp: string }) {
  const ms = Date.now() - new Date(timestamp).getTime()
  const text = ms < 60_000 ? 'just now' : `${formatDuration(ms)} ago`
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      {text}
    </span>
  )
}
