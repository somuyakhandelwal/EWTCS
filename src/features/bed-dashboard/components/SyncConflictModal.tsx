'use client'
// US-16.4: Modal for resolving offline sync conflicts.
// Shown when a drain discovers that the server stage no longer matches what we
// expected when we originally queued the change.

import React from 'react'
import { AlertTriangle, ArrowRight } from 'lucide-react'

export interface SyncConflict {
  /** Queue entry ID — used to identify which conflict to resolve */
  entryId: string
  bedId: string
  bedNumber: string
  /** Stage ID the user attempted while offline (used for force-apply) */
  attemptedStageId: string
  /** The stage the user requested while offline */
  attemptedStageName: string
  /** The current stage on the server (after another change happened) */
  serverStageName: string
}

interface SyncConflictModalProps {
  conflicts: SyncConflict[]
  isOpen: boolean
  /** True while a force-apply call is in flight */
  isApplying: boolean
  onKeepServer: (entryId: string) => void
  onForceApply: (entryId: string) => Promise<void>
  onClose: () => void
}

export const SyncConflictModal = React.memo(function SyncConflictModal({
  conflicts,
  isOpen,
  isApplying,
  onKeepServer,
  onForceApply,
  onClose,
}: SyncConflictModalProps) {
  if (!isOpen) return null

  const allResolved = conflicts.length === 0

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-modal-title"
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-amber-50 dark:bg-amber-950/40">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" aria-hidden="true" />
          <h2 id="conflict-modal-title" className="font-semibold text-gray-900 dark:text-gray-100">
            Sync Review Needed
          </h2>
          <span className="ml-auto text-sm text-gray-500">
            {conflicts.length} remaining
          </span>
        </div>

        {/* Body */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto space-y-4">
          {allResolved ? (
            <p className="text-sm text-gray-500 text-center py-4">
              All conflicts resolved.
            </p>
          ) : (
            conflicts.map((c) => (
              <div
                key={c.entryId}
                className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Bed {c.bedNumber}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-0.5 font-mono">
                    {c.attemptedStageName}
                  </span>
                  <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    Current stage: {c.serverStageName}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onKeepServer(c.entryId)}
                    disabled={isApplying}
                    className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                  >
                    Keep Current Stage
                  </button>
                  <button
                    onClick={() => onForceApply(c.entryId)}
                    disabled={isApplying}
                    className="flex-1 rounded-md bg-amber-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
                  >
                    Apply Latest Offline Update
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={!allResolved && conflicts.length > 0}
            className="rounded-md bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {allResolved ? 'Done' : 'Resolve all items to continue'}
          </button>
        </div>
      </div>
    </div>
  )
})
