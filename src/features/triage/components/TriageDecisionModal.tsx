'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'
import { type ErBedOption, type TriageBed, type TriageDecisionOutcome, TRIAGE_DECISION_LABELS, TRIAGE_DECISION_OUTCOMES } from '../types'

interface TriageDecisionModalProps {
  bed: TriageBed | null
  isOpen: boolean
  isSubmitting: boolean
  isLoadingErBeds: boolean
  error: string | null
  erBeds: ErBedOption[]
  onClose: () => void
  onSubmit: (bedId: string, outcome: TriageDecisionOutcome, erBedId?: string | null) => void
  onRefreshErBeds: () => void
}

export function TriageDecisionModal({
  bed,
  isOpen,
  isSubmitting,
  isLoadingErBeds,
  error,
  erBeds,
  onClose,
  onSubmit,
  onRefreshErBeds,
}: TriageDecisionModalProps) {
  const [outcome, setOutcome] = useState<TriageDecisionOutcome>('shift_to_er')
  const [erBedId, setErBedId] = useState<string>('')

  useEffect(() => {
    if (isOpen) {
      setOutcome('shift_to_er')
      setErBedId('')
    }
  }, [isOpen, bed?.id])

  if (!isOpen || !bed) return null

  const isErTransfer = outcome === 'shift_to_er'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="triage-decision-title"
    >
      <div className="w-full max-w-xl rounded-lg border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 id="triage-decision-title" className="text-lg font-semibold">Decision Outcome - {bed.bedNumber}</h2>
            <p className="text-sm text-muted-foreground">Record the next step after triage decision is made.</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={isSubmitting}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form
          className="space-y-4 p-4"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit(bed.id, outcome, isErTransfer ? (erBedId || null) : null)
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="triageOutcome">Decision outcome</Label>
            <select
              id="triageOutcome"
              value={outcome}
              disabled={isSubmitting}
              onChange={(event) => setOutcome(event.target.value as TriageDecisionOutcome)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {TRIAGE_DECISION_OUTCOMES.map((option) => (
                <option key={option} value={option}>{TRIAGE_DECISION_LABELS[option]}</option>
              ))}
            </select>
          </div>

          {isErTransfer && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="erBedSelect">Select ER bed</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onRefreshErBeds}
                  disabled={isSubmitting || isLoadingErBeds}
                >
                  Refresh
                </Button>
              </div>
              <select
                id="erBedSelect"
                value={erBedId}
                disabled={isSubmitting || isLoadingErBeds}
                onChange={(event) => setErBedId(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select an available ER bed</option>
                {erBeds.map((erBed) => (
                  <option key={erBed.id} value={erBed.id}>
                    {erBed.bedNumber} ({erBed.currentStageName})
                  </option>
                ))}
              </select>
              {isLoadingErBeds && (
                <p className="text-xs text-muted-foreground">Loading ER beds...</p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Record Outcome
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
