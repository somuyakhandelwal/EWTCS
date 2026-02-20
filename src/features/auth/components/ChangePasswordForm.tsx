'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { ShieldCheck } from 'lucide-react'
import { changePasswordAction } from '@/features/auth/actions/change-password-actions'

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <Button className="w-full" type="submit" disabled={pending}>
            {pending ? 'Updating password...' : 'Set New Password'}
        </Button>
    )
}

/**
 * US-5.5: Forced password-change form.
 * Rendered on /change-password when a user logs in with a temp password.
 */
export default function ChangePasswordForm() {
    const [state, action] = useActionState(changePasswordAction, undefined)

    return (
        <div className="flex min-h-screen items-center justify-center bg-black px-4 py-12 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-900/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-900/10 rounded-full blur-[100px]" />
            </div>

            <Card className="w-full max-w-sm shadow-xl bg-zinc-950/50 border-white/10 backdrop-blur-xl z-10 text-white">
                <CardHeader>
                    <div className="flex justify-center mb-2">
                        <span className="inline-flex items-center justify-center rounded-full bg-amber-900/30 border border-amber-900/50 p-2">
                            <ShieldCheck className="h-5 w-5 text-amber-400" />
                        </span>
                    </div>
                    <CardTitle className="text-xl font-bold text-center text-white">
                        Set New Password
                    </CardTitle>
                    <CardDescription className="text-center text-zinc-400 text-sm">
                        You are using a temporary password. Please set a new password to continue.
                    </CardDescription>
                </CardHeader>

                <form action={action}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="newPassword" className="text-zinc-200">
                                New Password
                            </Label>
                            <Input
                                id="newPassword"
                                name="newPassword"
                                type="password"
                                placeholder="Min 8 chars, 1 uppercase, 1 number"
                                required
                                autoComplete="new-password"
                                className="bg-black/50 border-white/10 text-white placeholder:text-zinc-600"
                            />
                            {state?.errors?.newPassword && (
                                <p className="text-xs text-red-400">{state.errors.newPassword[0]}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-zinc-200">
                                Confirm Password
                            </Label>
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                placeholder="Repeat new password"
                                required
                                autoComplete="new-password"
                                className="bg-black/50 border-white/10 text-white placeholder:text-zinc-600"
                            />
                            {state?.errors?.confirmPassword && (
                                <p className="text-xs text-red-400">{state.errors.confirmPassword[0]}</p>
                            )}
                        </div>

                        {state?.message && !state.success && (
                            <div className="p-3 bg-red-900/20 text-red-400 border border-red-900/50 text-sm rounded-md text-center">
                                {state.message}
                            </div>
                        )}

                        <ul className="text-xs text-zinc-500 space-y-0.5 list-disc list-inside">
                            <li>At least 8 characters</li>
                            <li>At least one uppercase letter (A–Z)</li>
                            <li>At least one number (0–9)</li>
                        </ul>
                    </CardContent>

                    <CardFooter>
                        <SubmitButton />
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
