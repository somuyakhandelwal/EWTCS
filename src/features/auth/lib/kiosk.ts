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
