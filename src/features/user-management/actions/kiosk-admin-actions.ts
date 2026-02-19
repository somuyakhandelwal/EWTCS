'use server'

// Kiosk Admin Actions
// Epic 5: Authentication & Role-Based Access (US-5.3)
// Purpose: Server actions for admin to list and revoke kiosk sessions

import { verifyActiveSession } from '@/features/auth/lib/active-session'
import { listActiveKioskSessions, revokeKioskSession } from '@/features/auth/lib/kiosk'

/**
 * Returns all active kiosk sessions for the admin panel.
 * Admin-only.
 */
export async function getActiveKioskSessionsAction() {
  const session = await verifyActiveSession()
  if (!session || session.role !== 'admin') {
    return { success: false as const, error: 'Unauthorized', sessions: [] }
  }

  try {
    const sessions = await listActiveKioskSessions()
    return { success: true as const, sessions }
  } catch (error) {
    console.error('Failed to list kiosk sessions:', error)
    return { success: false as const, error: 'Failed to fetch kiosk sessions', sessions: [] }
  }
}

/**
 * Revokes an active kiosk session.
 * Sets is_active = false so verifyActiveSession() kicks the user on their next request.
 * Admin-only.
 */
export async function revokeKioskSessionAction(kioskSessionId: string) {
  const session = await verifyActiveSession()
  if (!session || session.role !== 'admin') {
    return { success: false as const, error: 'Unauthorized' }
  }

  try {
    await revokeKioskSession(kioskSessionId, session.userId)
    return { success: true as const }
  } catch (error) {
    console.error('Failed to revoke kiosk session:', error)
    return { success: false as const, error: 'Failed to revoke session' }
  }
}
