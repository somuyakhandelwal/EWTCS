'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { login } from '@/features/auth/actions/auth-actions'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/shared/components/ui/card'

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <Button className="w-full" type="submit" disabled={pending}>
            {pending ? 'Signing in...' : 'Sign In'}
        </Button>
    )
}

export default function LoginPage() {
    const [state, action] = useActionState(login, undefined)

    return (
        <div className="flex min-h-screen items-center justify-center bg-black px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">

            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-zinc-800/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-800/20 rounded-full blur-[100px]" />
            </div>

            <Card className="w-full max-w-sm shadow-xl bg-zinc-950/50 border-white/10 backdrop-blur-xl relative z-10 text-white">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center text-white">Sign In</CardTitle>
                    <CardDescription className="text-center text-zinc-400">
                        Enter your credentials to access the nurse dashboard
                    </CardDescription>
                </CardHeader>
                <form action={action}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-zinc-200">Username</Label>
                            <Input
                                id="username"
                                name="username"
                                placeholder="Enter your username"
                                required
                                autoComplete="username"
                                className="bg-black/50 border-white/10 text-white placeholder:text-zinc-600 focus:ring-white/20 focus:border-white/20"
                            />
                            {state?.errors?.username && (
                                <p className="text-sm text-red-500">{state.errors.username}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-zinc-200">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                name="password"
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                                className="bg-black/50 border-white/10 text-white placeholder:text-zinc-600 focus:ring-white/20 focus:border-white/20"
                            />
                            {state?.errors?.password && (
                                <p className="text-sm text-red-500">{state.errors.password}</p>
                            )}
                        </div>
                        {state?.message && (
                            <div className="p-3 bg-red-900/20 text-red-400 border border-red-900/50 text-sm rounded-md text-center">
                                {state.message}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <SubmitButton />
                    </CardFooter>
                </form>
            </Card>

            <div className="absolute bottom-4 text-zinc-600 text-xs text-center w-full">
                &copy; 2026 EWTCS Project
            </div>
        </div>
    )
}
