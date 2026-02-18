'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Plus, Loader2 } from 'lucide-react'
import { createBed } from '../actions/bed-crud-actions'

interface Ward {
    id: string
    name: string
}

interface AddBedDialogProps {
    wards: Ward[]
    onSuccess: () => void
}

export function AddBedDialog({ wards, onSuccess }: AddBedDialogProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError(null)

        const formData = new FormData(e.currentTarget)

        startTransition(async () => {
            const result = await createBed(formData)

            if (result.success) {
                setIsOpen(false)
                onSuccess()
                // Reset form
                ;(e.target as HTMLFormElement).reset()
            } else {
                setError(result.error || 'Failed to create bed')
            }
        })
    }

    return (
        <>
            <Button onClick={() => setIsOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add New Bed
            </Button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold text-white mb-4">Add New Bed</h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Bed Number */}
                            <div className="space-y-2">
                                <Label htmlFor="bedNumber">Bed Number *</Label>
                                <Input
                                    id="bedNumber"
                                    name="bedNumber"
                                    placeholder="e.g., ER-01, ICU-05"
                                    required
                                    disabled={isPending}
                                    pattern="[A-Za-z0-9-]+"
                                    title="Only letters, numbers, and hyphens"
                                />
                            </div>

                            {/* Ward Selection */}
                            <div className="space-y-2">
                                <Label htmlFor="wardId">Ward *</Label>
                                <select
                                    id="wardId"
                                    name="wardId"
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
                                <Label htmlFor="location">Location (Optional)</Label>
                                <Input
                                    id="location"
                                    name="location"
                                    placeholder="e.g., Room 101, Bay 3"
                                    disabled={isPending}
                                />
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
                                    onClick={() => setIsOpen(false)}
                                    disabled={isPending}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        'Create Bed'
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
