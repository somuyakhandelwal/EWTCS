'use client'

import { type FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Tooltip } from '@/shared/components/ui/tooltip'
import ForgotPasswordInfo from '@/features/auth/components/ForgotPasswordInfo'
import { motion } from 'framer-motion'

export default function LoginPage() {
    const router = useRouter()
    const [pending, setPending] = useState(false)
    const [state, setState] = useState<{
        message?: string
        errors?: Record<string, string[]>
    }>({})

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
                setState({
                    message: result.message,
                    errors: result.errors,
                })
                return
            }

            router.push(result.redirectTo || '/dashboard')
            router.refresh()
            // Note: We don't setPending(false) here because we're navigating away
        } catch {
            setState({ message: 'Unable to sign in right now. Please try again.' })
            setPending(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">

            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-muted/50 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-muted/50 rounded-full blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-sm relative z-10"
            >
                <div data-help-id="login-form">
                <Card className="w-full shadow-2xl bg-card/40 border-border backdrop-blur-2xl text-foreground">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold text-center text-foreground">Sign In</CardTitle>
                        <CardDescription className="text-center text-muted-foreground">
                            Enter your credentials to access the nurse dashboard
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="username" className="text-foreground">Username</Label>
                                <Input
                                    id="username"
                                    name="username"
                                    placeholder="Enter your username"
                                    required
                                    autoComplete="username"
                                    className="bg-background/50 border-border text-foreground placeholder:text-muted-foreground focus:ring-ring focus:border-ring"
                                />
                                {state?.errors?.username && (
                                    <p className="text-sm text-red-500">{state.errors.username}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-foreground">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    name="password"
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                    className="bg-background/50 border-border text-foreground placeholder:text-muted-foreground focus:ring-ring focus:border-ring"
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

                            {/* US-5.3: Kiosk Mode option — for dedicated nurse workstations */}
                            <div data-help-id="login-kiosk" className="flex items-start gap-3 pt-1">
                                <input
                                    id="kioskMode"
                                    name="kioskMode"
                                    type="checkbox"
                                    className="mt-0.5 h-4 w-4 rounded border-border bg-background/50 accent-primary cursor-pointer"
                                />
                                <div>
                                    <Label htmlFor="kioskMode" className="text-foreground font-normal cursor-pointer">
                                        Enable Kiosk Mode
                                    </Label>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        Session never expires — for dedicated nurse workstations only
                                    </p>
                                </div>
                            </div>

                            {/* US-5.5: Forgot password info */}
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
            </motion.div>

            <div className="absolute bottom-4 text-muted-foreground text-xs text-center w-full">
                &copy; 2026 EWTCS Project
            </div>
        </div>
    )
}
