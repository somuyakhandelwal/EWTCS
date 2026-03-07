'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/shared/components/ui/button'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { deactivateBed, reactivateBed } from '../actions/bed-status-actions'
import type { BedManagementData } from '../types/bed-management.types'

interface ToggleBedStatusDialogProps {
    bed: BedManagementData | null
    action: 'deactivate' | 'reactivate'
    onClose: () => void
    onSuccess: () => void
}

export function ToggleBedStatusDialog({
    bed,
    action,
    onClose,
    onSuccess,
}: ToggleBedStatusDialogProps) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    if (!bed) return null

    const handleConfirm = async () => {
        setError(null)

        const formData = new FormData()
        formData.append('bedId', bed.id)

        startTransition(async () => {
            const result =
                action === 'deactivate'
                    ? await deactivateBed(formData)
                    : await reactivateBed(formData)

            if (result.success) {
                onSuccess()
                onClose()
            } else {
                setError(result.error || `Failed to ${action} bed`)
            }
        })
    }

    const isDeactivate = action === 'deactivate'

    return (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div
                        className={`p-2 rounded-full ${isDeactivate
                                ? 'bg-red-900/20 text-red-400'
                                : 'bg-green-900/20 text-green-400'
                            }`}
                    >
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">
                        {isDeactivate ? 'Deactivate Bed' : 'Reactivate Bed'}
                    </h2>
                </div>

                {/* Content */}
                <div className="space-y-4">
                    <p className="text-card-foreground">
                        {isDeactivate ? (
                            <>
                                Are you sure you want to deactivate bed{' '}
                                <span className="font-bold text-foreground">{bed.bedNumber}</span>?
                            </>
                        ) : (
                            <>
                                Are you sure you want to reactivate bed{' '}
                                <span className="font-bold text-foreground">{bed.bedNumber}</span>?
                            </>
                        )}
                    </p>

                    {isDeactivate && (
                        <div className="p-3 bg-yellow-900/20 border border-yellow-800 rounded-md text-yellow-400 text-sm">
                            <p className="font-medium mb-1">Note:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>The bed will be hidden from the nurse dashboard</li>
                                <li>It can be reactivated later from this page</li>
                                <li>Occupied beds cannot be deactivated</li>
                            </ul>
                        </div>
                    )}

                    {!isDeactivate && (
                        <div className="p-3 bg-green-900/20 border border-green-800 rounded-md text-green-400 text-sm">
                            <p>
                                The bed will be reactivated and will appear on the nurse dashboard.
                            </p>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-900/20 border border-red-800 rounded-md text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 justify-end pt-2">
                        <Button variant="outline" onClick={onClose} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={isPending}
                            variant={isDeactivate ? 'destructive' : 'default'}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    {isDeactivate ? 'Deactivating...' : 'Reactivating...'}
                                </>
                            ) : (
                                <>{isDeactivate ? 'Deactivate' : 'Reactivate'}</>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
