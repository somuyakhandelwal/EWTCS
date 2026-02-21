// Add Virtual Bed Modal
// US-6.6: Nurse / supervisor hallway & stretcher patient tracking

'use client'

import { useTransition, useRef, useState, useEffect } from 'react'
import { MapPin, X, Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

interface AddVirtualBedModalProps {
    open: boolean
    onClose: () => void
    onCreated: () => void
    /** Injected server action — keeps this component free of cross-feature imports */
    onSubmit: (formData: FormData) => Promise<{ success: boolean; error?: string }>
}

export function AddVirtualBedModal({ open, onClose, onCreated, onSubmit }: AddVirtualBedModalProps) {
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
            const result = await onSubmit(formData)
            if (result.success) {
                formRef.current?.reset()
                onCreated()
                onClose()
            } else {
                setError(result.error ?? 'Failed to create virtual bed.')
            }
        })
    }

    if (!open) return null

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
        >
            {/* Panel */}
            <div
                className="relative w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    type="button"
                    onClick={handleClose}
                    disabled={isPending}
                    className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-40"
                    aria-label="Close"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Header */}
                <div className="mb-4">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-purple-300">
                        <MapPin className="h-5 w-5 text-purple-400" />
                        Add Virtual Bed
                    </h2>
                    <p className="mt-1 text-sm text-zinc-400">
                        Track a patient on a stretcher or in a hallway. The bed will be marked{' '}
                        <span className="text-purple-300 font-medium">VIRTUAL</span> and can be
                        removed once the patient moves to a real bed or is discharged.
                    </p>
                </div>

                <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                    {/* Label */}
                    <div className="space-y-1.5">
                        <label
                            htmlFor="vBedLabel"
                            className="block text-sm font-medium text-zinc-300"
                        >
                            Label <span className="text-red-400">*</span>
                        </label>
                        <input
                            id="vBedLabel"
                            name="label"
                            type="text"
                            required
                            placeholder="e.g. Hallway Stretcher 3, Corridor B"
                            autoFocus
                            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        <p className="text-[11px] text-zinc-500">
                            Letters, numbers, spaces, and . _ ( ) - allowed. 2–100 characters.
                        </p>
                    </div>

                    {/* Location (optional) */}
                    <div className="space-y-1.5">
                        <label
                            htmlFor="vBedLocation"
                            className="block text-sm font-medium text-zinc-300"
                        >
                            Location{' '}
                            <span className="text-zinc-500 font-normal">(optional)</span>
                        </label>
                        <input
                            id="vBedLocation"
                            name="location"
                            type="text"
                            placeholder="e.g. Corridor B, Near Nurses Station"
                            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                            className="text-zinc-400 hover:text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isPending}
                            className="bg-purple-700 hover:bg-purple-600 text-white border-none"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Creating…
                                </>
                            ) : (
                                <>
                                    <MapPin className="h-4 w-4 mr-2" />
                                    Create Virtual Bed
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
