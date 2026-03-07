// Add Temporary Bed Modal
// US-6.2: Supervisor surge-capacity bed creation

'use client'

import { useTransition, useRef, useState, useEffect } from 'react'
import { Zap, X, Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { createTemporaryBed } from '../actions/temporary-bed-actions'

interface AddTemporaryBedModalProps {
    open: boolean
    onClose: () => void
    onCreated: () => void
}

export function AddTemporaryBedModal({ open, onClose, onCreated }: AddTemporaryBedModalProps) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const formRef = useRef<HTMLFormElement>(null)

    // Close on Escape key
    useEffect(() => {
        if (!open) return
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') handleClose()
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    function handleClose() {
        if (isPending) return
        setError(null)
        formRef.current?.reset()
        onClose()
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError(null)
        const formData = new FormData(e.currentTarget)

        startTransition(async () => {
            const result = await createTemporaryBed(formData)
            if (result.success) {
                formRef.current?.reset()
                onCreated()
                onClose()
            } else {
                setError(result.error ?? 'Failed to create temporary bed.')
            }
        })
    }

    if (!open) return null

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            onClick={handleClose}
        >
            {/* Panel */}
            <div
                className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    type="button"
                    onClick={handleClose}
                    disabled={isPending}
                    className="absolute right-4 top-4 text-muted-foreground hover:text-card-foreground transition-colors disabled:opacity-40"
                    aria-label="Close"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Header */}
                <div className="mb-4">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-orange-300">
                        <Zap className="h-5 w-5 text-orange-400" />
                        Add Temporary Bed
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Creates a surge-capacity bed in your ward. It will be marked{' '}
                        <span className="text-orange-300 font-medium">TEMP</span> and can be
                        removed once the surge is over.
                    </p>
                </div>

                <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                    {/* Bed Number */}
                    <div className="space-y-1.5">
                        <label
                            htmlFor="tmpBedNumber"
                            className="block text-sm font-medium text-card-foreground"
                        >
                            Bed Number <span className="text-red-400">*</span>
                        </label>
                        <input
                            id="tmpBedNumber"
                            name="bedNumber"
                            type="text"
                            required
                            placeholder="e.g. T-01, SURGE-A"
                            autoFocus
                            className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Letters, numbers, and hyphens only. 2–50 characters.
                        </p>
                    </div>

                    {/* Location (optional) */}
                    <div className="space-y-1.5">
                        <label
                            htmlFor="tmpBedLocation"
                            className="block text-sm font-medium text-card-foreground"
                        >
                            Location{' '}
                            <span className="text-muted-foreground font-normal">(optional)</span>
                        </label>
                        <input
                            id="tmpBedLocation"
                            name="location"
                            type="text"
                            placeholder="e.g. Corridor 3, Overflow Area"
                            className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <p className="rounded-md border border-red-800 bg-red-900/30 px-3 py-2 text-sm text-red-300">
                            {error}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleClose}
                            disabled={isPending}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isPending}
                            className="bg-orange-700 hover:bg-orange-600 text-foreground border-none"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Creating…
                                </>
                            ) : (
                                <>
                                    <Zap className="h-4 w-4 mr-2" />
                                    Create Temp Bed
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
