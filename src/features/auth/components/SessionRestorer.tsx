'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

/**
 * SessionRestorer component
 * US-13: Automatically restores kiosk sessions after browser crashes/restarts.
 * Should be added to RootLayout to ensure it runs on any page (specifically /login).
 */
export function SessionRestorer() {
    const router = useRouter()
    const pathname = usePathname()
    const [isRestoring, setIsRestoring] = useState(false)

    useEffect(() => {
        // Only trigger restoration if we are on the login page
        // and have a stored kiosk token.
        const token = localStorage.getItem('kiosk_session_token')

        if (token && pathname === '/login' && !isRestoring) {
            handleRestore(token)
        }
    }, [pathname])

    const handleRestore = async (token: string) => {
        setIsRestoring(true)
        try {
            const response = await fetch('/api/auth/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            })

            const result = await response.json()

            if (result.success) {
                // Restoration successful
                router.push(result.redirectTo || '/dashboard')
                router.refresh()
            } else {
                // Token invalid or revoked - clear it
                localStorage.removeItem('kiosk_session_token')
            }
        } catch (error) {
            console.error('Session restoration failed:', error)
        } finally {
            setIsRestoring(false)
        }
    }

    // This component doesn't render anything visible
    return null
}
