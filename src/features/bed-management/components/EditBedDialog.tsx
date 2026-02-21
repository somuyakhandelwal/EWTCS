'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Loader2 } from 'lucide-react'
import { updateBed } from '../actions/bed-crud-actions'
import type { BedManagementData } from '../types/bed-management.types'
import { appendRecoveryLog } from '@/shared/lib/recovery-draft'
import { useRecoveryDraftForm } from '@/shared/hooks/useRecoveryDraftForm'

interface Ward {
    id: string
    name: string
}

interface EditBedDialogProps {
    bed: BedManagementData | null
    wards: Ward[]
    onClose: () => void
    onSuccess: () => void
}

export function EditBedDialog({ bed, wards, onClose, onSuccess }: EditBedDialogProps) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [bedNumber, setBedNumber] = useState('')
    const [wardId, setWardId] = useState('')
    const [location, setLocation] = useState('')

    // Reset error when bed changes
    useEffect(() => {
        setError(null)
        setBedNumber(bed?.bedNumber ?? '')
        setWardId(bed?.wardId ?? '')
        setLocation(bed?.location ?? '')
    }, [bed])

    const draftKey = `ewtcs:edit-bed-draft:${bed?.id ?? 'none'}`
    const handleRestore = useCallback((draft: { bedNumber: string; wardId: string; location: string }) => {
        setBedNumber(draft.bedNumber)
        setWardId(draft.wardId)
        setLocation(draft.location)
    }, [])

    const { restoredNotice, clearDraft } = useRecoveryDraftForm({
        draftKey,
        values: { bedNumber, wardId, location },
        baseline: {
            bedNumber: bed?.bedNumber ?? '',
            wardId: bed?.wardId ?? '',
            location: bed?.location ?? '',
        },
        enabled: Boolean(bed),
        onRestore: handleRestore,
        restorePrompt: 'Unsaved bed edits were found. Restore them now?',
        restoredEvent: 'edit_bed_form_restored',
        rejectedEvent: 'edit_bed_form_restore_rejected',
        eventContext: { bedId: bed?.id ?? 'none' },
    })

    if (!bed) return null

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError(null)

        const formData = new FormData()
        formData.set('bedNumber', bedNumber)
        formData.set('wardId', wardId)
        formData.set('location', location)
        formData.append('bedId', bed.id)

        startTransition(async () => {
            const result = await updateBed(formData)

            if (result.success) {
                clearDraft()
                appendRecoveryLog('edit_bed_form_saved', { bedId: bed.id })
                onSuccess()
                onClose()
            } else {
                appendRecoveryLog('edit_bed_form_save_failed', { bedId: bed.id })
                setError(result.error || 'Failed to update bed')
            }
        })
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold text-white mb-4">Edit Bed</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Bed Number */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-bedNumber">Bed Number *</Label>
                        <Input
                            id="edit-bedNumber"
                            name="bedNumber"
                            value={bedNumber}
                            onChange={(event) => setBedNumber(event.target.value)}
                            placeholder="e.g., ER-01, ICU-05"
                            required
                            disabled={isPending}
                            pattern="[A-Za-z0-9-]+"
                            title="Only letters, numbers, and hyphens"
                        />
                    </div>

                    {/* Ward Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-wardId">Ward *</Label>
                        <select
                            id="edit-wardId"
                            name="wardId"
                            value={wardId}
                            onChange={(event) => setWardId(event.target.value)}
                            required
                            disabled={isPending}
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select ward...</option>
                            {wards.map((ward) => (
                                <option key={ward.id} value={ward.id}>
                                    {ward.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Location (Optional) */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-location">Location (Optional)</Label>
                        <Input
                            id="edit-location"
                            name="location"
                            value={location}
                            onChange={(event) => setLocation(event.target.value)}
                            placeholder="e.g., Room 101, Bay 3"
                            disabled={isPending}
                        />
                    </div>

                    {restoredNotice && (
                        <div className="p-3 bg-emerald-900/20 border border-emerald-800 rounded-md text-emerald-400 text-sm">
                            Recovered unsaved bed edits from previous session.
                        </div>
                    )}

                    {/* Current Status Info */}
                    <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-zinc-400">
                        <div>
                            <span className="font-medium">Current Stage:</span>{' '}
                            {bed.currentStageName || 'Unknown'}
                        </div>
                        <div>
                            <span className="font-medium">Status:</span>{' '}
                            {bed.isOccupied ? 'Occupied' : 'Available'}
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-900/20 border border-red-800 rounded-md text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 justify-end pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isPending}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                'Update Bed'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
