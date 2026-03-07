// Alert Card Component
// EPIC 15: Notifications & Alerts (US-15.4)
// Purpose: Renders a single alert with severity, description, elapsed time,
//   acknowledgment status, and an acknowledge action.

'use client'

import { useState } from 'react'
import { AlertTriangle, Hourglass, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/ui/button'
import { AlertSeverityBadge } from './AlertSeverityBadge'
import { acknowledgeAlertAction } from '../actions/alert-actions'
import { EXPIRY_HOURS_OPTIONS } from '../schemas/alert-schemas'
import type { Alert } from '../types/alert'
import type { ExpiryHours } from '../schemas/alert-schemas'

interface AlertCardProps {
  alert: Alert
  onAcknowledged: () => void
}

const SEVERITY_BORDER: Record<Alert['severity'], string> = {
  critical: 'border-red-700/50 bg-red-950/20',
  warning:  'border-amber-700/40 bg-amber-950/15',
}

const TYPE_ICON = {
  delayed_bed:            AlertTriangle,
  disposition_bottleneck: Hourglass,
}

export function AlertCard({ alert, onAcknowledged }: AlertCardProps) {
  const [expiryHours, setExpiryHours] = useState<ExpiryHours>(2)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const Icon = TYPE_ICON[alert.type]

  async function handleAcknowledge() {
    setIsSubmitting(true)
    setError(null)

    const result = await acknowledgeAlertAction({
      alertKey:    alert.id,
      alertType:   alert.type,
      bedId:       alert.bedId,
      expiryHours,
    })

    setIsSubmitting(false)

    if (!result.success) {
      setError(result.error ?? 'Failed to acknowledge')
      return
    }

    onAcknowledged()
  }

  return (
    <div
      className={cn(
        'rounded-lg border p-4 space-y-3 transition-opacity',
        SEVERITY_BORDER[alert.severity],
        alert.isAcknowledged && 'opacity-60'
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <Icon
            className={cn(
              'h-4 w-4 mt-0.5 shrink-0',
              alert.severity === 'critical' ? 'text-red-400' : 'text-amber-400'
            )}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white leading-tight">{alert.title}</p>
            <p className="text-xs text-zinc-400 mt-0.5 leading-snug">{alert.description}</p>
          </div>
        </div>
        <AlertSeverityBadge severity={alert.severity} type={alert.type} className="shrink-0" />
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <Clock className="h-3 w-3" />
        <span>
          Bed <span className="font-medium text-zinc-300">{alert.bedNumber}</span>
        </span>
        <span>·</span>
        <span>
          Started{' '}
          {alert.startedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Acknowledged chip */}
      {alert.isAcknowledged && alert.acknowledgedBy && alert.acknowledgedUntil && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>
            Acknowledged by <span className="font-medium">{alert.acknowledgedBy}</span> until{' '}
            {new Date(alert.acknowledgedUntil).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      )}

      {/* Acknowledge controls */}
      <div className="flex items-center gap-2">
        <select
          value={expiryHours}
          onChange={(e) => setExpiryHours(Number(e.target.value) as ExpiryHours)}
          disabled={isSubmitting}
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          {EXPIRY_HOURS_OPTIONS.map((h) => (
            <option key={h} value={h}>
              {h}h
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="outline"
          onClick={handleAcknowledge}
          disabled={isSubmitting}
          className="text-xs h-7 px-3"
        >
          {isSubmitting ? 'Saving…' : alert.isAcknowledged ? 'Re-acknowledge' : 'Acknowledge'}
        </Button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
