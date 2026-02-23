'use client'
/**
 * PiiWarning — inline warning banner shown below a textarea when PII is detected (US-17.6)
 *
 * Shows:
 *   - A red warning bar listing detected PII types
 *   - A "Supervisor Override" link when the field allows overrides
 *   - Blocks submission by keeping the submit button disabled (controlled by parent via hasPii)
 */

import { AlertTriangle, ShieldAlert } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface PiiWarningProps {
  /** Human-readable label string from getPiiWarningLabels, e.g. "Phone number, Email address" */
  warningLabels: string
  /** Whether to show the override option (only on overrideReason fields for supervisors) */
  allowOverride?: boolean
  /** Called when supervisor clicks "Override anyway" */
  onOverride?: () => void
  /** Whether override has been confirmed (shows a different visual state) */
  overrideConfirmed?: boolean
  className?: string
}

export function PiiWarning({
  warningLabels,
  allowOverride = false,
  onOverride,
  overrideConfirmed = false,
  className,
}: PiiWarningProps) {
  if (!warningLabels) return null

  if (overrideConfirmed) {
    return (
      <div
        className={cn(
          'flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-300',
          className
        )}
        role="alert"
        aria-live="polite"
      >
        <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-400" />
        <span>
          <span className="font-semibold">Override applied.</span> Possible PII ({warningLabels}) will be logged and
          audited.
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md border border-red-500/50 bg-red-950/40 px-3 py-2 text-xs text-red-300',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-red-400" />
      <div className="flex-1 space-y-1">
        <p>
          <span className="font-semibold">Possible patient information detected:</span> {warningLabels}.
          Remove before submitting.
        </p>
        {allowOverride && onOverride && (
          <button
            type="button"
            onClick={onOverride}
            className="underline underline-offset-2 text-amber-400 hover:text-amber-300 transition-colors"
          >
            Supervisor override — submit anyway
          </button>
        )}
      </div>
    </div>
  )
}
