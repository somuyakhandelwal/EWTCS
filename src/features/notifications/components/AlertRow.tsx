import { Button } from '@/shared/components/ui/button'
import { CheckCheck } from 'lucide-react'
import type { AlertItem } from '@/features/notifications/types/alert-item'
import { SEVERITY_CONFIG, KIND_LABELS, SeverityBadge, TimeAgo } from './alert-screen-config'

export interface AlertRowProps {
  alert: AlertItem
  onAcknowledge: (alert: AlertItem) => void
  ackLoading: boolean
}

export function AlertRow({ alert, onAcknowledge, ackLoading }: AlertRowProps) {
  const cfg = SEVERITY_CONFIG[alert.severity]
  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-lg border p-4 transition-opacity ${cfg.rowClass} ${alert.acknowledged ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <cfg.Icon className={`h-5 w-5 mt-0.5 shrink-0 ${alert.acknowledged ? 'text-muted-foreground' : ''}`} />
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-sm text-foreground">{alert.title}</span>
            <SeverityBadge severity={alert.severity} />
            <span className="rounded px-1.5 py-0.5 text-xs bg-muted text-muted-foreground">
              {KIND_LABELS[alert.kind]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground truncate max-w-prose">{alert.description}</p>
          <TimeAgo timestamp={alert.timestamp} />
        </div>
      </div>

      {!alert.acknowledged && (
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => onAcknowledge(alert)}
          disabled={ackLoading}
          title="Acknowledge alert"
        >
          <CheckCheck className="h-4 w-4 mr-1" />
          Ack
        </Button>
      )}
      {alert.acknowledged && (
        <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1 mt-1">
          <CheckCheck className="h-3.5 w-3.5" />
          Acknowledged
        </span>
      )}
    </div>
  )
}
