'use server'

// Kiosk Admin Actions
// Epic 5: Authentication & Role-Based Access (US-5.3)
// Purpose: Server actions for admin to list and revoke kiosk sessions

import { requireAdmin, requireAdminWrite } from '@/features/user-management/lib/auth'
import { listActiveKioskSessions, revokeKioskSession } from '@/shared/lib/kiosk-queries'
import { logger } from '@/shared/config/logger'

/**
 * Returns all active kiosk sessions for the admin panel.
 * Admin-only.
 */
export async function getActiveKioskSessionsAction() {
  try {
    await requireAdmin()
    const sessions = await listActiveKioskSessions()
    return { success: true as const, sessions }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch kiosk sessions'
    if (message.startsWith('Unauthorized')) {
      return { success: false as const, error: 'Unauthorized', sessions: [] }
    }
    logger.error('Failed to list kiosk sessions', error as Error)
    return { success: false as const, error: 'Failed to fetch kiosk sessions', sessions: [] }
  }
}

/**
 * Revokes an active kiosk session.
 * Sets is_active = false so verifyActiveSession() kicks the user on their next request.
 * Admin-only.
 */
export async function revokeKioskSessionAction(kioskSessionId: string) {
  try {
    const session = await requireAdminWrite({
      actionType: 'DEACTIVATE',
      entityType: 'kiosk_session',
      entityId: kioskSessionId,
    })
    await revokeKioskSession(kioskSessionId, session.userId)
    return { success: true as const }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to revoke session'
    if (message.startsWith('Unauthorized')) {
      return { success: false as const, error: 'Unauthorized' }
    }
    logger.error('Failed to revoke kiosk session', error as Error)
    return { success: false as const, error: 'Failed to revoke session' }
  }
}
