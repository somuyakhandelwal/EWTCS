'use client'

import { memo, useEffect } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Loader2, AlertTriangle, X } from 'lucide-react'
import type { Stage } from '../types/bed'
import { cn } from '@/shared/lib/utils'
import { getStageColorClasses } from '@/shared/utils/stage-colors'

interface ConfirmationModalProps {
    isOpen: boolean
    bedNumber: string | null
    fromStageName: string | null
    toStage: Stage | null
    onConfirm: () => void
    onCancel: () => void
    isUpdating?: boolean
}

export const ConfirmationModal = memo(function ConfirmationModal({
    isOpen,
    bedNumber,
    fromStageName,
    toStage,
    onConfirm,
    onCancel,
    isUpdating = false,
}: ConfirmationModalProps) {
    const colorClasses = getStageColorClasses(toStage?.colorCode)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return

            if (e.key === 'Escape') {
                e.preventDefault()
                onCancel()
            } else if (e.key === 'Enter') {
                e.preventDefault()
                onConfirm()
            }
        }

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown)
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen, onCancel, onConfirm])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div
                className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg max-w-md w-full mx-4 p-6 space-y-4 animate-in zoom-in-95 duration-200"
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                aria-describedby="confirm-desc"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                        <h2 id="confirm-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">Confirm Critical Update</h2>
                    </div>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 rounded"
                        disabled={isUpdating}
                        aria-label="Close confirmation"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>

                <div className="space-y-4" id="confirm-desc">
                    <p className="text-gray-600 dark:text-gray-300">
                        Are you sure you want to update Bed <span className="font-semibold text-gray-900 dark:text-gray-100">{bedNumber}</span>?
                    </p>

                    <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-md p-3 space-y-2 text-sm border border-gray-200 dark:border-zinc-700">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 dark:text-gray-400">From Stage:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{fromStageName}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-gray-200 dark:border-zinc-700 pt-2">
                            <span className="text-gray-500 dark:text-gray-400">To Stage:</span>
                            <span
                                className={cn(
                                    'font-bold px-2 py-0.5 rounded text-xs uppercase tracking-wider border',
                                    colorClasses.bg,
                                    colorClasses.text,
                                    colorClasses.border
                                )}
                            >
                                {toStage?.name}
                            </span>
                        </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs p-3 rounded-md" role="status">
                        This is a critical stage change. Please verify the patient status before proceeding.
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        disabled={isUpdating}
                        className="focus:ring-2 focus:ring-zinc-400"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isUpdating}
                        className="focus:ring-2 focus:ring-red-400"
                    >
                        {isUpdating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                                <span>Updating...</span>
                            </>
                        ) : (
                            'Confirm Update'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
})
