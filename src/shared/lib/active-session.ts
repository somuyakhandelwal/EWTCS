import 'server-only'
import { verifySession, deleteSession } from './session'
import { isTokenBlacklisted } from './auth-service'
import { cookies } from 'next/headers'
import pool from '@/shared/lib/db'

type ActiveUserCacheEntry = {
    result: boolean
    expiresAt: number
}

const ACTIVE_USER_CACHE_TTL_MS = 30_000
const activeUserCache = new Map<string, ActiveUserCacheEntry>()

function getCachedActiveUser(userId: string): boolean | null {
    const cached = activeUserCache.get(userId)
    if (!cached) return null

    if (cached.expiresAt <= Date.now()) {
        activeUserCache.delete(userId)
        return null
    }

    return cached.result
}

function setActiveUserCache(userId: string, result: boolean): void {
    activeUserCache.set(userId, {
        result,
        expiresAt: Date.now() + ACTIVE_USER_CACHE_TTL_MS,
    })
}

export function invalidateActiveUserCache(userId: string): void {
    activeUserCache.delete(userId)
}

export function clearActiveUserCache(): void {
    activeUserCache.clear()
}

/**
 * Verify session AND check user is still active in database.
 * US-5.7 Acceptance Criteria: "Deactivated users cannot log in"
 *
 * Two-layer defense:
 * 1. Login prevention (auth-actions.ts checks is_active at login)
 * 2. Session invalidation (this function checks is_active on every request)
 *
 * IMPORTANT: Only use in Server Components / Server Actions (Node.js runtime).
 * Do NOT use in middleware (Edge Runtime) — use verifySession() there instead.
 */
export async function verifyActiveSession() {
    const session = await verifySession()
    if (!session) return null

    // Check if token is blacklisted
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    if (token && await isTokenBlacklisted(token)) {
        await deleteSession()
        return null
    }

    let isActive = getCachedActiveUser(session.userId)
    if (isActive === null) {
        const { rows } = await pool.query(
            'SELECT is_active FROM users WHERE id = $1',
            [session.userId]
        )

        isActive = rows.length > 0 && Boolean(rows[0].is_active)
        setActiveUserCache(session.userId, isActive)
    }

    if (!isActive) {
        // User doesn't exist or is deactivated — destroy session cookie
        await deleteSession()
        return null
    }

    // US-5.3: Kiosk session — verify it hasn't been revoked by an admin
    if (session.isKiosk && session.kioskSessionId) {
        const { rows: kioskRows } = await pool.query(
            'SELECT 1 FROM kiosk_sessions WHERE id = $1 AND is_active = true',
            [session.kioskSessionId]
        )
        if (kioskRows.length === 0) {
            await deleteSession()
            return null
        }
    }

    return session
}
