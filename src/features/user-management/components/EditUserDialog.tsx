'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { X, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react'
import { updateUser } from '@/features/user-management/actions/user-management-actions'

interface User {
    id: string
    username: string
    role: string
    is_active: boolean
    ward_id?: string | null
}

interface Ward { id: string; name: string; code: string }

interface EditUserDialogProps {
    user: User
    isOpen: boolean
    onClose: () => void
    wards?: Ward[]
}

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <Button
            type="submit"
            disabled={pending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
        >
            {pending ? 'Updating...' : 'Update User'}
        </Button>
    )
}

export default function EditUserDialog({ user, isOpen, onClose, wards = [] }: EditUserDialogProps) {
    const [state, action] = useActionState(updateUser, undefined)
    const formRef = useRef<HTMLFormElement>(null)

    // Reset form when dialog opens/closes or user changes
    useEffect(() => {
        if (isOpen && formRef.current) {
            formRef.current.reset()
        }
    }, [isOpen, user.id])

    // Close dialog on success after showing success message
    useEffect(() => {
        if (state?.success && isOpen) {
            const timer = setTimeout(() => {
                onClose()
                window.location.reload()
            }, 1500)
            return () => clearTimeout(timer)
        }
    }, [state?.success, isOpen, onClose])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl w-full max-w-md p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-white">Edit User</h2>
                        <p className="text-sm text-zinc-400 mt-1">
                            Update user details for <span className="text-white font-medium">{user.username}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-zinc-400 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form ref={formRef} action={action} className="space-y-4">
                    {/* Hidden user ID */}
                    <input type="hidden" name="userId" value={user.id} />

                    <div className="space-y-2">
                        <Label htmlFor="username" className="text-zinc-200">
                            Username
                        </Label>
                        <Input
                            id="username"
                            name="username"
                            defaultValue={user.username}
                            className="bg-black/50 border-zinc-700 text-white"
                        />
                        {state?.errors?.username && (
                            <p className="text-sm text-red-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {state.errors.username}
                            </p>
                        )}
                    </div>

                    {/* Password is managed exclusively via Reset Password — not here.
                        This prevents two competing, inconsistent flows. US-5.5 */}
                    <div className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-xs text-zinc-500">
                        <KeyRound className="h-3.5 w-3.5 shrink-0 text-amber-500/70" />
                        To change a user&apos;s password, use the{' '}
                        <span className="font-medium text-amber-400/80">Reset Password</span>{' '}
                        button on the user list.
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role" className="text-zinc-200">
                            Role
                        </Label>
                        <select
                            id="role"
                            name="role"
                            defaultValue={user.role}
                            className="w-full px-3 py-2 bg-black/50 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="nurse">Nurse</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="admin">Admin</option>
                        </select>
                        {state?.errors?.role && (
                            <p className="text-sm text-red-500">{state.errors.role}</p>
                        )}
                    </div>

                    {wards.length > 0 && (
                        <div className="space-y-2">
                            <Label htmlFor="wardId" className="text-zinc-200">
                                Ward Assignment <span className="text-zinc-500 font-normal">(Optional)</span>
                            </Label>
                            <select
                                id="wardId"
                                name="wardId"
                                defaultValue={user.ward_id ?? ''}
                                className="w-full px-3 py-2 bg-black/50 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">No ward assigned</option>
                                {wards.map(w => (
                                    <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {state?.message && (
                        <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${
                            state.success
                                ? 'bg-blue-900/20 text-blue-400 border border-blue-900/50'
                                : 'bg-red-900/20 text-red-400 border border-red-900/50'
                        }`}>
                            {state.success ? (
                                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                            ) : (
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            )}
                            <span>{state.message}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="text-zinc-400 border-zinc-700 hover:bg-zinc-800"
                        >
                            Cancel
                        </Button>
                        <SubmitButton />
                    </div>
                </form>
            </div>
        </div>
    )
}
