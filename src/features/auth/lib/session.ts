import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

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

/**
 * Verify JWT session from cookie (Edge-compatible, no DB calls).
 * Used by middleware for route protection.
 */
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
        return payload as unknown as SessionPayload
    } catch (err) {
        // Signature verification failures are expected when SESSION_SECRET changes
        // Don't log them as they're normal, just return null (no session)
        const errorCode = (err as Record<string, unknown>)?.code
        if (errorCode !== 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
            console.warn('Unexpected session verification error:', err instanceof Error ? err.message : String(err))
        }
        return null
    }
}

export async function deleteSession() {
    const cookieStore = await cookies()
    cookieStore.delete('session')
}
