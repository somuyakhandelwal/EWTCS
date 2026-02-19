'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'
import { Input } from '@/shared/components/ui/input'
import { Clock, FileText, Loader2 } from 'lucide-react'
import { correctBedStageLog } from '../actions/bed-actions'
import { formatDurationToMinutes, validateCorrectionForm } from '../lib/bed-correction-utils'

interface BedHistoryCorrectionFormProps {
    onClose: () => void
    onSuccess: () => void
    logId: string | null
    initialDurationMs: number | null
    initialNotes: string | null
}

export function BedHistoryCorrectionForm({
    onClose,
    onSuccess,
    logId,
    initialDurationMs,
    initialNotes
}: BedHistoryCorrectionFormProps) {
    // State management for form fields
    const [reason, setReason] = useState('')
    const [durationMinutes, setDurationMinutes] = useState(() => formatDurationToMinutes(initialDurationMs))
    const [notes, setNotes] = useState(initialNotes || '')

    // UI state
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    /**
     * Handles the form submission
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!logId) {
            setError("Missing log ID. Cannot process correction.")
            return
        }

        // Run client-side validation
        const validationError = validateCorrectionForm(reason, durationMinutes)
        if (validationError) {
            setError(validationError)
            alert(validationError)
            return
        }

        // Compare with initial values to only send changed fields
        const originalDurationMins = formatDurationToMinutes(initialDurationMs)
        const hasDurationChanged = durationMinutes !== originalDurationMins
        const hasNotesChanged = notes !== (initialNotes || '')

        startTransition(async () => {
            try {
                const result = await correctBedStageLog({
                    logId,
                    reason,
                    newDuration: hasDurationChanged ? durationMinutes : undefined,
                    newNotes: hasNotesChanged ? notes : undefined
                })

                if (result.success) {
                    onSuccess()
                    onClose()
                    setReason('')
                    setError(null)
                } else {
                    const msg = result.error || "An error occurred while saving the correction."
                    setError(msg)
                    alert(msg)
                }
            } catch (err) {
                console.error("Correction failed", err)
                setError("An unexpected network error occurred.")
                alert("An unexpected network error occurred.")
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="space-y-2">
                <Label htmlFor="reason" className="text-amber-500 font-medium">
                    Reason for Correction <span className="text-red-500">*</span>
                </Label>
                <textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain why this record needs correction (e.g., 'Nurse forgot to update immediately')"
                    className="flex min-h-[80px] w-full rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-zinc-100"
                    required
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="duration" className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-zinc-500" />
                        Duration (min)
                    </Label>
                    <Input
                        id="duration"
                        type="number"
                        min="0"
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(e.target.value)}
                        className="bg-zinc-800/50 border-zinc-700"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="notes" className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-zinc-500" />
                        Notes
                    </Label>
                    <Input
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="bg-zinc-800/50 border-zinc-700"
                    />
                </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-900/50 p-3 rounded-lg text-xs text-amber-200/80">
                <p><strong>Note:</strong> Original records are never deleted. This correction will be added to the audit trail with your Supervisor ID.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
                    Cancel
                </Button>
                <Button
                    type="submit"
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    disabled={isPending || reason.length < 5}
                >
                    {isPending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        'Log Correction'
                    )}
                </Button>
            </div>
        </form>
    )
}
