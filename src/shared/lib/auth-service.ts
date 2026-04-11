import 'server-only'
import { decodeJwt, jwtVerify } from 'jose'
import pool from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'

const secretKey = process.env.SESSION_SECRET
if (!secretKey) {
    throw new Error('SESSION_SECRET is not defined in environment variables.')
}
const encodedKey = new TextEncoder().encode(secretKey)

type CacheEntry = {
    result: boolean
    expiresAt: number
}

const NEGATIVE_BLACKLIST_TTL_MS = 60_000
const tokenBlacklistCache = new Map<string, CacheEntry>()

function getTokenRemainingTtlMs(token: string): number {
    try {
        const payload = decodeJwt(token)
        if (typeof payload.exp !== 'number') return 0

        const expiresAtMs = payload.exp * 1000
        return Math.max(0, expiresAtMs - Date.now())
    } catch {
        return 0
    }
}

function getCachedBlacklistResult(token: string): boolean | null {
    const cached = tokenBlacklistCache.get(token)
    if (!cached) return null

    if (cached.expiresAt <= Date.now()) {
        tokenBlacklistCache.delete(token)
        return null
    }

    return cached.result
}

function setBlacklistCache(token: string, result: boolean, ttlMs: number): void {
    if (ttlMs <= 0) {
        tokenBlacklistCache.delete(token)
        return
    }

    tokenBlacklistCache.set(token, {
        result,
        expiresAt: Date.now() + ttlMs,
    })
}

export function invalidateTokenBlacklistCache(token: string): void {
    tokenBlacklistCache.delete(token)
}

export function clearTokenBlacklistCache(): void {
    tokenBlacklistCache.clear()
}

/**
 * Invalidates a session token by adding it to the blacklist
 */
export async function invalidateToken(token: string) {
    if (!token) return

    try {
        const { payload } = await jwtVerify(token, encodedKey, {
            algorithms: ['HS256'],
        })

        // Use expiration time from token, or default to 7 days from now if missing
        const expiresAt = payload.exp
            ? new Date(payload.exp * 1000)
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

        await pool.query(
            'INSERT INTO token_blacklist (token, expires_at) VALUES ($1, $2) ON CONFLICT (token) DO NOTHING',
            [token, expiresAt]
        )

        // Keep process-local cache consistent with the persisted blacklist write.
        const tokenTtlMs = Math.max(0, expiresAt.getTime() - Date.now())
        setBlacklistCache(token, true, tokenTtlMs)
    } catch (error) {
        logger.error('Failed to invalidate token', error instanceof Error ? error : undefined)
        // Ensure we don't throw, just log.
    }
}

/**
 * Checks if a token is in the blacklist
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
    if (!token) return false

    const cachedResult = getCachedBlacklistResult(token)
    if (cachedResult !== null) {
        return cachedResult
    }

    try {
        const { rows } = await pool.query(
            'SELECT 1 FROM token_blacklist WHERE token = $1',
            [token]
        )

        const isBlacklisted = rows.length > 0
        const ttlMs = isBlacklisted
            ? getTokenRemainingTtlMs(token)
            : NEGATIVE_BLACKLIST_TTL_MS

        setBlacklistCache(token, isBlacklisted, ttlMs)
        return isBlacklisted
    } catch (error) {
        logger.error('Failed to check token blacklist', error instanceof Error ? error : undefined)
        return true  // Bug 8 fix: fail-closed — treat DB errors as blacklisted (US-6.5)
    }
}
