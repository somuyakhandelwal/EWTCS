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
    role: string
    expiresAt: Date // Stored as string in JWT, but Date in runtime object if parsed? JWT claims are usually timestamps (numbers)
}

export async function createSession(userId: string, role: string) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    const session = await new SignJWT({ userId, role })
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
        return payload
    } catch (err) {
        console.warn('Failed to verify session', err)
        return null
    }
}

export async function deleteSession() {
    const cookieStore = await cookies()
    cookieStore.delete('session')
}
