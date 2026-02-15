import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import pool from '@/shared/lib/db'

const secretKey = process.env.SESSION_SECRET
if (!secretKey) {
    throw new Error('SESSION_SECRET is not defined in environment variables.')
}
const encodedKey = new TextEncoder().encode(secretKey)

type SessionPayload = {
    userId: string
    username: string
    role: string
    expiresAt: Date
}

export async function createSession(userId: string, username: string, role: string) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    const session = await new SignJWT({ userId, username, role })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(encodedKey)

    const cookieStore = await cookies()
    cookieStore.set('session', session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: expiresAt,
        sameSite: 'lax',
        path: '/',
    })
}

export async function verifySession() {
    const cookieStore = await cookies()
    const session = cookieStore.get('session')?.value

    if (!session) {
        return null
    }

    try {
        const { payload } = await jwtVerify(session, encodedKey, {
            algorithms: ['HS256'],
        })
        
        // CRITICAL: Verify user is still active in database
        // US-5.7 Acceptance Criteria: "Deactivated users cannot log in"
        // This prevents deactivated users from using existing sessions
        const { rows } = await pool.query(
            'SELECT is_active FROM users WHERE id = $1',
            [payload.userId as string]
        )
        
        if (rows.length === 0 || !rows[0].is_active) {
            // User doesn't exist or is deactivated - invalidate session
            await deleteSession()
            return null
        }
        
        return payload as unknown as SessionPayload
    } catch (err) {
        console.warn('Failed to verify session', err)
        return null
    }
}

export async function deleteSession() {
    const cookieStore = await cookies()
    cookieStore.delete('session')
}
