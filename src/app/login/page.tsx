'use client'

import { type FormEvent, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Tooltip } from '@/shared/components/ui/tooltip'
import ForgotPasswordInfo from '@/features/auth/components/ForgotPasswordInfo'
import AuthBackground, { KioskRestoreLoader } from '@/features/auth/components/AuthBackground'

export default function LoginPage() {
    const router = useRouter()
    const [pending, setPending] = useState(false)
    const [isRestoring, setIsRestoring] = useState(true)
    const [state, setState] = useState<{
        message?: string
        errors?: Record<string, string[]>
    }>({})

    useEffect(() => {
        const attemptRestore = async () => {
            const token = localStorage.getItem('kiosk_recovery_token')
            if (!token) {
                setIsRestoring(false)
                return
            }
            try {
                const response = await fetch('/api/auth/restore-kiosk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ kioskToken: token })
                })
                const result = await response.json()
                if (result.success) {
                    router.push(result.redirectTo || '/dashboard')
                    router.refresh()
                } else {
                    localStorage.removeItem('kiosk_recovery_token')
                    setIsRestoring(false)
                }
            } catch {
                setIsRestoring(false)
            }
        }
        attemptRestore()
    }, [router])

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setPending(true)
        setState({})

        const formData = new FormData(event.currentTarget)
        const payload = {
            username: String(formData.get('username') || ''),
            password: String(formData.get('password') || ''),
            kioskMode: formData.get('kioskMode') === 'on',
        }

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            const result = await response.json()

            if (!response.ok || !result.success) {
                setState({ message: result.message, errors: result.errors })
                setPending(false)
                return
            }

            if (result.kioskToken) {
                localStorage.setItem('kiosk_recovery_token', result.kioskToken)
            }

            router.push(result.redirectTo || '/dashboard')
            router.refresh()
        } catch {
            setState({ message: 'Unable to sign in right now. Please try again.' })
            setPending(false)
        }
    }

    if (isRestoring) return <KioskRestoreLoader />

    return (
        <AuthBackground>
            <div data-help-id="login-form">
                <Card className="w-full shadow-2xl bg-card/40 border-border backdrop-blur-2xl text-foreground">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold text-center">Sign In</CardTitle>
                        <CardDescription className="text-center">
                            Enter your credentials to access the nurse dashboard
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    name="username"
                                    placeholder="Enter your username"
                                    required
                                    autoComplete="username"
                                    className="bg-background/50 border-border"
                                />
                                {state?.errors?.username && (
                                    <p className="text-sm text-red-500">{state.errors.username}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    name="password"
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                    className="bg-background/50 border-border"
                                />
                                {state?.errors?.password && (
                                    <p className="text-sm text-red-500">{state.errors.password}</p>
                                )}
                            </div>
                            {state?.message && (
                                <div className="p-3 bg-destructive/20 text-destructive border border-destructive/50 text-sm rounded-md text-center">
                                    {state.message}
                                </div>
                            )}

                            <div data-help-id="login-kiosk" className="flex items-start gap-3 pt-1">
                                <input
                                    id="kioskMode"
                                    name="kioskMode"
                                    type="checkbox"
                                    className="mt-1 h-4 w-4 rounded border-border bg-background/50 accent-primary cursor-pointer"
                                />
                                <div>
                                    <Label htmlFor="kioskMode" className="font-normal cursor-pointer">
                                        Enable Kiosk Mode
                                    </Label>
                                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">
                                        Session never expires — for dedicated nurse workstations
                                    </p>
                                </div>
                            </div>
                            <ForgotPasswordInfo />
                        </CardContent>
                        <CardFooter>
                            <Tooltip content="Sign in to your dashboard" side="top">
                                <Button className="w-full" type="submit" loading={pending}>
                                    Sign In
                                </Button>
                            </Tooltip>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </AuthBackground>
    )
}
