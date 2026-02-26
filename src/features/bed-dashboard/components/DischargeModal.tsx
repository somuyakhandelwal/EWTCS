'use client'
// Discharge Confirmation Modal
// Epic 2: One-Click Stage Update System (US-2.3)
//
// Shown when a nurse selects "Discharge Process" on an occupied bed.
// Replaces the generic ConfirmationModal for this specific critical workflow.

import { memo, useEffect } from 'react'
import { LogOut, Clock, X, Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { formatElapsedTime } from '../lib/utils'
import type { DischargeState } from '../types/bed'

interface DischargeModalProps {
  isOpen: boolean
  dischargeState: DischargeState | null
  onConfirm: () => void
  onCancel: () => void
  isSubmitting?: boolean
}

export const DischargeModal = memo(function DischargeModal({
  isOpen,
  dischargeState,
  onConfirm,
  onCancel,
  isSubmitting = false,
}: DischargeModalProps) {
  // Keyboard shortcuts: Enter = confirm, Escape = cancel
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      } else if (e.key === 'Enter' && !isSubmitting) {
        e.preventDefault()
        onConfirm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onConfirm, onCancel, isSubmitting])

  if (!isOpen || !dischargeState) return null

  const { bedNumber, fromStageName, elapsedTimeMs } = dischargeState
  const elapsedFormatted = formatElapsedTime(elapsedTimeMs)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="bg-card border border-destructive/40 rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/30">
              <LogOut className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Confirm Patient Discharge</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                This will archive the patient record and reset the bed.
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-card-foreground transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Details */}
        <div className="p-6 space-y-4">
          <div className="rounded-lg bg-muted border border-border divide-y divide-zinc-700/50 text-sm">
            <div className="flex justify-between items-center px-4 py-3">
              <span className="text-muted-foreground">Bed</span>
              <span className="font-semibold text-foreground">{bedNumber}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-3">
              <span className="text-muted-foreground">Current Stage</span>
              <span className="font-medium text-card-foreground">{fromStageName ?? 'Unknown'}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-3">
              <span className="text-muted-foreground">Total Patient Time</span>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span
                  className={cn(
                    'font-bold',
                    elapsedTimeMs && elapsedTimeMs > 10_800_000
                      ? 'text-destructive'
                      : 'text-card-foreground'
                  )}
                >
                  {elapsedFormatted}
                </span>
              </div>
            </div>
          </div>

          {/* What will happen */}
          <div className="rounded-lg bg-muted/50 border border-border p-4 space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              What happens on confirm
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 text-primary">✓</span>
                Patient record archived to history
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 text-primary">✓</span>
                Bed moved to <span className="font-semibold text-foreground">Cleaning</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 text-primary">✓</span>
                Timer reset — ready for next patient
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 text-primary">✓</span>
                Action logged in audit trail
              </li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <Button
            variant="outline"
            className="flex-1 border-border text-card-foreground hover:bg-muted"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Discharging…
              </>
            ) : (
              'Confirm Discharge'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
})
