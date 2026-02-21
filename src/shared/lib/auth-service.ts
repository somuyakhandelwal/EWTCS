import 'server-only'
import { jwtVerify } from 'jose'
import pool from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'

const secretKey = process.env.SESSION_SECRET
if (!secretKey) {
    throw new Error('SESSION_SECRET is not defined in environment variables.')
}
const encodedKey = new TextEncoder().encode(secretKey)

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

    try {
        const { rows } = await pool.query(
            'SELECT 1 FROM token_blacklist WHERE token = $1',
            [token]
        )
        return rows.length > 0
    } catch (error) {
        logger.error('Failed to check token blacklist', error instanceof Error ? error : undefined)
        return true  // Bug 8 fix: fail-closed — treat DB errors as blacklisted (US-6.5)
    }
}
