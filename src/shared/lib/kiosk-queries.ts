import 'server-only'
// Kiosk Admin Queries
// Purpose: Shared DB helpers for listing and revoking kiosk sessions (admin panel)
// Note: createKioskSession / isKioskSessionActive live in features/auth/lib/kiosk.ts
//       because they are called during the auth login flow.

import pool from '@/shared/lib/db'

export interface KioskSessionRow {
  id: string
  userId: string
  username: string
  boundIp: string
  isActive: boolean
  createdAt: Date
  disabledAt: Date | null
  disabledBy: string | null
}

/**
 * Returns all currently active kiosk sessions with user info.
 * Used by the admin panel (KioskSessionsPanel).
 */
export async function listActiveKioskSessions(): Promise<KioskSessionRow[]> {
  const { rows } = await pool.query(
    `SELECT ks.id,
            ks.user_id      AS "userId",
            u.username,
            ks.bound_ip     AS "boundIp",
            ks.is_active    AS "isActive",
            ks.created_at   AS "createdAt",
            ks.disabled_at  AS "disabledAt",
            ks.disabled_by  AS "disabledBy"
     FROM   kiosk_sessions ks
     JOIN   users u ON u.id = ks.user_id
     WHERE  ks.is_active = true
     ORDER  BY ks.created_at DESC`
  )
  return rows as KioskSessionRow[]
}

/**
 * Marks a kiosk session as disabled.
 * Called by admin via revokeKioskSessionAction.
 */
export async function revokeKioskSession(
  kioskSessionId: string,
  disabledBy: string
): Promise<void> {
  await pool.query(
    `UPDATE kiosk_sessions
     SET is_active = false, disabled_at = NOW(), disabled_by = $2
     WHERE id = $1`,
    [kioskSessionId, disabledBy]
  )
}
