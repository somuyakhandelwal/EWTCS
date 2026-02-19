// Kiosk Session Library
// Epic 5: Authentication & Role-Based Access (US-5.3)
// Purpose: DB helpers for creating, verifying, and revoking kiosk sessions

import 'server-only'
import pool from '@/shared/lib/db'

export interface KioskSession {
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
 * Insert a new kiosk session record and return its UUID.
 * Called during login when the user ticks "Kiosk Mode".
 */
export async function createKioskSession(userId: string, boundIp: string): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO kiosk_sessions (user_id, bound_ip) VALUES ($1, $2) RETURNING id`,
    [userId, boundIp]
  )
  return rows[0].id as string
}

/**
 * Returns true when the kiosk session exists and is still active.
 * Used by verifyActiveSession() to enforce admin revocation.
 */
export async function isKioskSessionActive(kioskSessionId: string): Promise<boolean> {
  const { rows } = await pool.query(
    'SELECT 1 FROM kiosk_sessions WHERE id = $1 AND is_active = true',
    [kioskSessionId]
  )
  return rows.length > 0
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

/**
 * Returns all currently active kiosk sessions with user info.
 * Used by the admin panel.
 */
export async function listActiveKioskSessions(): Promise<KioskSession[]> {
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
  return rows as KioskSession[]
}
