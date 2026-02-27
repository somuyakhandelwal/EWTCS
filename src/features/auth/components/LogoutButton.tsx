'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export function LogoutButton({ className }: { className?: string }) {
    const router = useRouter()

    const handleLogout = async () => {
        try {
            // Call API endpoint
            await fetch('/api/auth/logout', {
                method: 'POST',
            })
        } catch {
            // Logout API failed; proceed with local cleanup
        } finally {
            // Client-side cleanup
            localStorage.clear()
            sessionStorage.clear()

            // Clear all cookies accessible via JS (optional, as httpOnly is cleared by server)
            document.cookie.split(";").forEach((c) => {
                document.cookie = c
                    .replace(/^ +/, "")
                    .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });

            // Redirect to login
            router.replace('/login')
            router.refresh()
        }
    }

    return (
        <button
            onClick={handleLogout}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-500 hover:text-red-400 transition-colors ${className}`}
            aria-label="Logout"
        >
            <LogOut className="h-4 w-4" />
            Logout
        </button>
    )
}
