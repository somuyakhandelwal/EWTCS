import { verifyActiveSession } from '@/features/auth/lib/active-session'

/**
 * Verify admin permission for user management actions
 * Epic 5: US-5.3 - User Management
 * Ensures only admins can perform user management operations
 */
export async function requireAdmin() {
    const session = await verifyActiveSession()
    if (!session || session.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required')
    }
    return session
}
