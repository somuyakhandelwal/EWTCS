'use client'

/**
 * EPIC 7 — EditHistoryModal
 * Modal shell for supervisor stage history corrections.
 * Loads available stages on mount so the supervisor can pick the correct "to" stage.
 *
 * AC 1 — opened from AuditorHistoryTable Edit button (supervisor/admin only)
 * AC 2 — correctionReason mandatory (enforced in EditHistoryForm + server action)
 * AC 3 — original values shown read-only in EditHistoryForm
 * AC 4 — success state shown; parent receives correctionId to render badge
 * AC 5 — submitHistoryCorrection logs supervisor ID server-side
 */

import { useState, useEffect } from 'react'
import { X, CheckCircle, ShieldCheck } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { EditHistoryForm } from './EditHistoryForm'
import { submitHistoryCorrection } from '../actions/stage-history-correction-write-actions'
import { getStages } from '@/features/stage-management/actions/stage-actions'
import type { AuditorHistoryRecord } from '../lib/auditor-history-queries'
import type { StageOption } from './EditHistoryForm'

function toDatetimeLocalValue(date: Date | string): string {
  const d = new Date(date)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

interface EditHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  record: AuditorHistoryRecord
  onCorrectionSaved: (correctionId: string) => void
}

export function EditHistoryModal({ isOpen, onClose, record, onCorrectionSaved }: EditHistoryModalProps) {
  const originalTime = toDatetimeLocalValue(record.transitionTime)

  const [stages, setStages] = useState<StageOption[]>([])
  const [toStageId, setToStageId] = useState('')
  const [notes, setNotes] = useState(record.notes ?? '')
  const [transitionTime, setTransitionTime] = useState(originalTime)
  const [correctionReason, setCorrectionReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Load stages and seed toStageId to the record's current "to" stage
  useEffect(() => {
    if (!isOpen) return
    getStages().then((all) => {
      const opts: StageOption[] = all.map((s) => ({ id: s.id as string, name: s.name as string }))
      setStages(opts)
      // Pre-select the existing "to" stage by name match
      const current = opts.find((s) => s.name === record.toStageName)
      setToStageId(current?.id ?? opts[0]?.id ?? '')
    })
  }, [isOpen, record.toStageName])

  if (!isOpen) return null

  const originalStageId = stages.find((s) => s.name === record.toStageName)?.id ?? ''
  const hasChanges =
    notes !== (record.notes ?? '') ||
    transitionTime !== originalTime ||
    (toStageId !== '' && toStageId !== originalStageId)

  async function handleSubmit() {
    setFormError(null)
    if (!correctionReason.trim()) { setFormError('A correction reason is required.'); return }
    if (!hasChanges) { setFormError('No fields have been changed.'); return }

    const correctedFields: { notes?: string; transition_time?: string; to_stage_id?: string } = {}
    if (notes !== (record.notes ?? '')) correctedFields.notes = notes
    if (transitionTime !== originalTime) correctedFields.transition_time = new Date(transitionTime).toISOString()
    if (toStageId !== originalStageId) correctedFields.to_stage_id = toStageId

    setSubmitting(true)
    const result = await submitHistoryCorrection({ bedStageLogId: record.id, correctionReason, correctedFields })
    setSubmitting(false)

    if (result.success === false) { setFormError(result.error ?? 'An unexpected error occurred.'); return }
    setSuccess(true)
    onCorrectionSaved(result.data!.correctionId)
  }

  function handleClose() {
    if (submitting) return
    setFormError(null); setSuccess(false); setCorrectionReason('')
    setNotes(record.notes ?? ''); setTransitionTime(originalTime)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={handleClose}>
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg"><ShieldCheck className="h-5 w-5 text-amber-400" /></div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Edit Stage History</h2>
              <p className="text-xs text-muted-foreground">
                Bed <span className="text-card-foreground font-medium">{record.bedNumber}</span>
                {' · '}<span className="font-mono text-muted-foreground">{record.id.slice(0, 8)}…</span>
              </p>
            </div>
          </div>
          <button onClick={handleClose} disabled={submitting} className="text-muted-foreground hover:text-foreground p-2 hover:bg-muted rounded-full disabled:opacity-40">
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="p-10 flex flex-col items-center gap-4 text-center">
            <div className="p-3 bg-green-500/10 rounded-full"><CheckCircle className="h-9 w-9 text-green-400" /></div>
            <p className="text-foreground font-semibold text-lg">Correction saved</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              The original record is preserved. Your correction has been logged with your supervisor ID.
            </p>
            <Button onClick={handleClose} className="mt-2 bg-zinc-700 hover:bg-zinc-600">Close</Button>
          </div>
        ) : (
          <>
            <EditHistoryForm
              record={record} stages={stages} toStageId={toStageId}
              notes={notes} transitionTime={transitionTime} correctionReason={correctionReason}
              formError={formError}
              onStageChange={setToStageId} onNotesChange={setNotes}
              onTimeChange={setTransitionTime} onReasonChange={setCorrectionReason}
            />
            <div className="p-4 border-t border-border flex items-center justify-between gap-3 bg-card">
              <p className="text-xs text-muted-foreground hidden sm:block">Original data is always preserved.</p>
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={handleClose} disabled={submitting}>Cancel</Button>
                <Button onClick={handleSubmit}
                  disabled={submitting || !correctionReason.trim() || !hasChanges}
                  className="bg-amber-600 hover:bg-amber-500 text-foreground disabled:opacity-40">
                  {submitting ? 'Saving…' : 'Save Correction'}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
