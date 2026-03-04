// Kiosk Session Library
// Epic 5: Authentication & Role-Based Access (US-5.3)
// Purpose: DB helpers for creating, verifying, and revoking kiosk sessions

import 'server-only'
import pool from '@/shared/lib/db'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { logger } from '@/shared/config/logger'
import { encodedKey, type SessionPayload } from '@/shared/lib/session'

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
 * Restore a kiosk session from a persisted token.
 * US-13: Ensures session persists after browser crashes or restarts.
 */
export async function restoreKioskSession(token: string) {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ['HS256'],
    })

    const sessionData = payload as unknown as SessionPayload

    if (!sessionData.isKiosk) {
      throw new Error('Not a kiosk session token')
    }

    // Verify it still exists in DB and is active
    const { rows } = await pool.query(
      'SELECT 1 FROM kiosk_sessions WHERE id = $1 AND is_active = true',
      [sessionData.kioskSessionId]
    )

    if (rows.length === 0) {
      throw new Error('Kiosk session has been revoked')
    }

    // Re-establish cookie
    const cookieStore = await cookies()
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      maxAge: 365 * 24 * 60 * 60,
      sameSite: 'lax',
      path: '/',
    })

    logger.info('Kiosk session restored', { userId: sessionData.userId, sessionId: sessionData.kioskSessionId })
    return sessionData
  } catch (err) {
    logger.error('Kiosk session restoration failed', err instanceof Error ? err : new Error(String(err)))
    return null
  }
}
