'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Plus, Loader2 } from 'lucide-react'
import { createWard } from '../actions/ward-actions'
import { useRouter } from 'next/navigation'

export function AddWardDialog() {
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError(null)
        const formData = new FormData(e.currentTarget)

        startTransition(async () => {
            const result = await createWard(formData)
            if (result.success) {
                setIsOpen(false)
                router.refresh()
            } else {
                setError(result.error || 'Failed to create ward')
            }
        })
    }

    return (
        <>
            <Button onClick={() => setIsOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add New Ward
            </Button>

            {isOpen && (
                <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold text-foreground mb-4">Add New Ward</h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Ward Name *</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    placeholder="e.g., Intensive Care Unit"
                                    required
                                    disabled={isPending}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="code">Ward Code *</Label>
                                <Input
                                    id="code"
                                    name="code"
                                    placeholder="e.g., ICU"
                                    required
                                    disabled={isPending}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description (Optional)</Label>
                                <Input
                                    id="description"
                                    name="description"
                                    placeholder="e.g., Critical patient care zone"
                                    disabled={isPending}
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive font-medium text-sm">
                                    {error}
                                </div>
                            )}

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
                                        'Create Ward'
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
