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
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div
                className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200"
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                aria-describedby="confirm-desc"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-foreground">
                        <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
                        <h2 id="confirm-title" className="text-lg font-semibold text-foreground">Confirm Critical Update</h2>
                    </div>
                    <button
                        onClick={onCancel}
                        className="text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded"
                        disabled={isUpdating}
                        aria-label="Close confirmation"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>

                <div className="space-y-4" id="confirm-desc">
                    <p className="text-muted-foreground">
                        Are you sure you want to update Bed <span className="font-semibold text-foreground">{bedNumber}</span>?
                    </p>

                    <div className="bg-muted rounded-md p-3 space-y-2 text-sm border border-border">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">From Stage:</span>
                            <span className="font-medium text-foreground">{fromStageName}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-border pt-2">
                            <span className="text-muted-foreground">To Stage:</span>
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

                    <div className="bg-muted/50 border border-border text-muted-foreground text-xs p-3 rounded-md" role="status">
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
