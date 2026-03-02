'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/shared/components/ui/button'
import { X, Copy, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react'
import { adminResetPassword } from '@/features/user-management/actions/password-reset-actions'

interface ResetPasswordDialogProps {
    user: { id: string; username: string }
    isOpen: boolean
    onClose: () => void
}

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <Button
            type="submit"
            disabled={pending}
            className="bg-amber-600 hover:bg-amber-700 text-foreground"
        >
            {pending ? 'Generating...' : 'Generate Temporary Password'}
        </Button>
    )
}

export default function ResetPasswordDialog({ user, isOpen, onClose }: ResetPasswordDialogProps) {
    const [state, action] = useActionState<
        { success: boolean; message: string; tempPassword?: string } | undefined,
        FormData
    >(adminResetPassword, undefined)
    const [copied, setCopied] = useState(false)
    const formRef = useRef<HTMLFormElement>(null)

    // Reset state when dialog reopens for different user
    useEffect(() => {
        if (isOpen) {
            formRef.current?.reset()
            setCopied(false)
        }
    }, [isOpen, user.id])

    if (!isOpen) return null

    const handleCopy = () => {
        if (state?.tempPassword) {
            navigator.clipboard.writeText(state.tempPassword)
            setCopied(true)
            setTimeout(() => setCopied(false), 2500)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                    <div className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-amber-400" />
                        <h2 className="text-base font-semibold text-foreground">Reset Password</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-card-foreground transition-colors"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-4">
                    {!state?.success ? (
                        <>
                            <p className="text-sm text-card-foreground">
                                Generate a temporary password for{' '}
                                <span className="font-semibold text-foreground">{user.username}</span>.
                                The user will be required to change it on next login.
                            </p>
                            <p className="text-xs text-amber-400/80 bg-amber-900/10 border border-amber-900/30 rounded-md px-3 py-2">
                                Temporary passwords expire after <strong>24 hours</strong>.
                                Share the generated password securely and immediately.
                            </p>

                            {state?.message && !state.success && (
                                <div className="flex items-center gap-2 text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-md px-3 py-2">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    {state.message}
                                </div>
                            )}

                            <form ref={formRef} action={action}>
                                <input type="hidden" name="userId" value={user.id} />
                                <div className="flex justify-end gap-2 pt-1">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={onClose}
                                        className="border-border text-card-foreground hover:bg-muted"
                                    >
                                        Cancel
                                    </Button>
                                    <SubmitButton />
                                </div>
                            </form>
                        </>
                    ) : (
                        /* Success state — show temp password once */
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm text-emerald-400">
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                {state.message}
                            </div>
                            <div className="rounded-md border border-border bg-background p-3">
                                <p className="text-xs text-muted-foreground mb-1.5">Temporary password (shown once):</p>
                                <div className="flex items-center justify-between gap-3">
                                    <code className="text-base font-mono text-amber-300 tracking-widest">
                                        {state.tempPassword}
                                    </code>
                                    <button
                                        type="button"
                                        onClick={handleCopy}
                                        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                        aria-label="Copy temporary password"
                                    >
                                        {copied ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                This password will not be shown again. Once you close this dialog it cannot be recovered.
                            </p>
                            <div className="flex justify-end pt-1">
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={onClose}
                                    className="bg-muted hover:bg-zinc-700 text-foreground"
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
