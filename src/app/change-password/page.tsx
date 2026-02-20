import { redirect } from 'next/navigation'
import { verifySession } from '@/shared/lib/session'
import { getPasswordResetStatus } from '@/features/auth/lib/password-reset-db'
import ChangePasswordForm from '@/features/auth/components/ChangePasswordForm'

/**
 * US-5.5: Forced password-change page.
 *
 * Guard logic (server-side):
 *   - No session          → middleware already redirects to /login
 *   - Session but DB flag is FALSE → user navigated here manually; send them home
 *   - Session and DB flag is TRUE  → render the change-password form
 *
 * This keeps the JWT clean (no mustChangePassword flag) and prevents stale
 * cookies from trapping users on this page.
 */
export default async function ChangePasswordPage() {
    const session = await verifySession()

    // Middleware handles the unauthenticated case, but double-check here.
    if (!session) redirect('/login')

    const { mustChangePassword } = await getPasswordResetStatus(session.userId)

    // User doesn't actually need to change their password — send them home.
    if (!mustChangePassword) {
        if (session.role === 'admin') redirect('/admin')
        if (session.role === 'supervisor') redirect('/supervisor')
        redirect('/dashboard')
    }

    return <ChangePasswordForm />
}

export const metadata = {
    title: 'Set New Password — EWTCS',
}
