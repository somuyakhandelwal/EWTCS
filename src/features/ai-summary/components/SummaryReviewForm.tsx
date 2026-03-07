'use client'
// AI Summary Review Form
// EPIC 9 US-9.3 / US-9.5: Supervisor reviews, edits, approves, or rejects a draft summary.

import { useState, useTransition } from 'react'
import { approveSummaryAction, rejectSummaryAction } from '../actions/summary-actions'
import type { DailySummary } from '../types/summary'

interface SummaryReviewFormProps {
  summary: DailySummary
  onDone?: () => void
}

export function SummaryReviewForm({ summary, onDone }: SummaryReviewFormProps) {
  const [reviewedText, setReviewedText]       = useState(summary.aiText ?? '')
  const [supervisorNotes, setSupervisorNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (summary.status !== 'draft') {
    return (
      <p className="text-sm text-zinc-400 italic">
        This summary has already been {summary.status}. No further actions available.
      </p>
    )
  }

  function handleApprove() {
    setError(null)
    if (reviewedText.trim().length < 50) {
      setError('Reviewed text must be at least 50 characters.')
      return
    }
    startTransition(async () => {
      const result = await approveSummaryAction({
        summaryId: summary.id,
        reviewedText: reviewedText.trim(),
        supervisorNotes: supervisorNotes.trim() || undefined,
      })
      if (!result.success) { setError(result.error ?? 'Approval failed'); return }
      onDone?.()
    })
  }

  function handleReject() {
    setError(null)
    if (rejectionReason.trim().length < 5) {
      setError('Please provide a rejection reason (at least 5 characters).')
      return
    }
    startTransition(async () => {
      const result = await rejectSummaryAction({
        summaryId: summary.id,
        rejectionReason: rejectionReason.trim(),
      })
      if (!result.success) { setError(result.error ?? 'Rejection failed'); return }
      setShowRejectModal(false)
      onDone?.()
    })
  }

  return (
    <div className="space-y-5">
      {/* Editable narrative */}
      <div>
        <label htmlFor="reviewedText" className="block text-sm font-medium text-zinc-300 mb-1">
          Review and edit the AI narrative
        </label>
        <textarea
          id="reviewedText"
          value={reviewedText}
          onChange={(e) => setReviewedText(e.target.value)}
          rows={10}
          maxLength={5000}
          disabled={isPending}
          className="w-full rounded-lg border border-zinc-600 bg-zinc-800 text-zinc-100 text-sm px-3 py-2
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     resize-y placeholder:text-zinc-500 disabled:opacity-50"
          placeholder="Edit the AI-generated text before approving…"
        />
        <p className="text-xs text-zinc-500 mt-1">{reviewedText.length} / 5000 characters</p>
      </div>

      {/* Supervisor notes */}
      <div>
        <label htmlFor="supervisorNotes" className="block text-sm font-medium text-zinc-300 mb-1">
          Supervisor notes <span className="text-zinc-500">(optional)</span>
        </label>
        <textarea
          id="supervisorNotes"
          value={supervisorNotes}
          onChange={(e) => setSupervisorNotes(e.target.value)}
          rows={3}
          maxLength={1000}
          disabled={isPending}
          className="w-full rounded-lg border border-zinc-600 bg-zinc-800 text-zinc-100 text-sm px-3 py-2
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     resize-y placeholder:text-zinc-500 disabled:opacity-50"
          placeholder="Add any clinical context or caveats…"
        />
      </div>

      {/* Error banner */}
      {error && (
        <p className="rounded-md bg-red-900/30 border border-red-700 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleApprove}
          disabled={isPending}
          className="flex-1 rounded-lg bg-green-700 hover:bg-green-600 disabled:opacity-50
                     text-white text-sm font-semibold py-2 transition-colors"
        >
          {isPending ? 'Saving…' : 'Approve & Publish'}
        </button>
        <button
          type="button"
          onClick={() => { setShowRejectModal(true); setError(null) }}
          disabled={isPending}
          className="rounded-lg bg-zinc-700 hover:bg-red-900/60 disabled:opacity-50 border border-zinc-600
                     hover:border-red-700 text-zinc-200 hover:text-red-200 text-sm font-semibold px-4 py-2 transition-colors"
        >
          Reject
        </button>
      </div>

      {/* Rejection reason modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Reject Summary</h2>
            <p className="text-sm text-zinc-400">
              Explain why this summary should not be published. This reason will be recorded.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              maxLength={500}
              disabled={isPending}
              className="w-full rounded-lg border border-zinc-600 bg-zinc-800 text-zinc-100 text-sm px-3 py-2
                         focus:outline-none focus:ring-2 focus:ring-red-500 resize-y disabled:opacity-50"
              placeholder="Reason for rejection…"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setShowRejectModal(false); setError(null) }}
                disabled={isPending}
                className="rounded-lg border border-zinc-600 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm px-4 py-2 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isPending}
                className="rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
