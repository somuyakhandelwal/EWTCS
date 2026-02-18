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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div
        className="bg-zinc-900 border border-red-800/60 rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-900/30 border border-red-800/50">
              <LogOut className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Confirm Patient Discharge</h2>
              <p className="text-sm text-zinc-400 mt-0.5">
                This will archive the patient record and reset the bed.
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Details */}
        <div className="p-6 space-y-4">
          <div className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 divide-y divide-zinc-700/50 text-sm">
            <div className="flex justify-between items-center px-4 py-3">
              <span className="text-zinc-400">Bed</span>
              <span className="font-semibold text-white">{bedNumber}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-3">
              <span className="text-zinc-400">Current Stage</span>
              <span className="font-medium text-zinc-200">{fromStageName ?? 'Unknown'}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-3">
              <span className="text-zinc-400">Total Patient Time</span>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-zinc-400" />
                <span
                  className={cn(
                    'font-bold',
                    elapsedTimeMs && elapsedTimeMs > 10_800_000
                      ? 'text-red-400'
                      : 'text-zinc-200'
                  )}
                >
                  {elapsedFormatted}
                </span>
              </div>
            </div>
          </div>

          {/* What will happen */}
          <div className="rounded-lg bg-amber-950/30 border border-amber-800/40 p-4 space-y-1.5">
            <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
              What happens on confirm
            </p>
            <ul className="space-y-1 text-xs text-amber-200/80">
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 text-amber-400">✓</span>
                Patient record archived to history
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 text-amber-400">✓</span>
                Bed moved to <span className="font-semibold text-amber-200">Cleaning</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 text-amber-400">✓</span>
                Timer reset — ready for next patient
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 text-amber-400">✓</span>
                Action logged in audit trail
              </li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <Button
            variant="outline"
            className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-red-700 hover:bg-red-600 text-white border-red-600"
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
