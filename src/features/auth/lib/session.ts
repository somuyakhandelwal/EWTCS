import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const secretKey = process.env.SESSION_SECRET
if (!secretKey) {
    throw new Error('SESSION_SECRET is not defined in environment variables.')
}
const encodedKey = new TextEncoder().encode(secretKey)

// US-5.2: Configurable session durations via environment variables
const SESSION_MAX_AGE_MS = Number(process.env.SESSION_MAX_AGE_MS) || 12 * 60 * 60 * 1000      // 12 hours
const INACTIVITY_TIMEOUT_MS = Number(process.env.INACTIVITY_TIMEOUT_MS) || 30 * 60 * 1000     // 30 min idle

type SessionPayload = {
    userId: string
    username: string
    role: string
    expiresAt: Date
    lastActivity?: number
    isKiosk?: boolean
    kioskIp?: string
    kioskSessionId?: string
}

// Passed to createSession when the user enables kiosk mode at login
export type KioskOptions = {
    isKiosk: true
    kioskIp: string
    kioskSessionId: string
}

export async function createSession(
    userId: string,
    username: string,
    role: string,
    kiosk?: KioskOptions
) {
    const expiresAt = kiosk
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year for kiosk
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)   // 7 days standard
    const jwtPayload = {
        userId, username, role,
        ...(kiosk && { isKiosk: true, kioskIp: kiosk.kioskIp, kioskSessionId: kiosk.kioskSessionId }),
    }
    const session = await new SignJWT(jwtPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(kiosk ? '1y' : '7d')
        .sign(encodedKey)

    const cookieStore = await cookies()
    cookieStore.set('session', session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: expiresAt,
        maxAge: SESSION_MAX_AGE_MS / 1000,  // seconds mein
        sameSite: 'lax',
        path: '/',
        ...(kiosk && { maxAge: 365 * 24 * 60 * 60 }),
    })
}

/**
 * Verify JWT session from cookie (Edge-compatible, no DB calls).
 * US-5.2: Also checks inactivity timeout and renews session on activity.
 * Used by middleware for route protection.
 */
export async function verifySession() {
    const cookieStore = await cookies()
    const session = cookieStore.get('session')?.value

    if (!session) return null

    try {
        const { payload } = await jwtVerify(session, encodedKey, {
            algorithms: ['HS256'],
        })

        const sessionData = payload as unknown as SessionPayload

        // US-5.2 AC-4: Check inactivity timeout
        const now = Date.now()
        const lastActivity = sessionData.lastActivity || now
        if (now - lastActivity > INACTIVITY_TIMEOUT_MS) {
            // Idle too long — delete session
            cookieStore.set('session', '', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                expires: new Date(0),
                sameSite: 'lax',
                path: '/',
                maxAge: 0,
            })
            return null
        }

        // US-5.2 AC-5: Renew session on activity (sliding expiry)
        // Only works in Server Actions/Route Handlers, silently skip elsewhere
        try {
            await renewSession(sessionData)
        } catch {
            // Cookie modification not allowed in this context — skip renewal
        }

        return sessionData
    } catch (err) {
        const errorCode = (err as Record<string, unknown>)?.code
        if (errorCode !== 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
            console.warn('Unexpected session verification error:', err instanceof Error ? err.message : String(err))
        }
        return null
    }
}

/**
 * US-5.2 AC-5: Renew session cookie on every activity.
 * Resets both the JWT expiry and the inactivity timer.
 */
async function renewSession(sessionData: SessionPayload) {
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS)

    const newSession = await new SignJWT({
        userId: sessionData.userId,
        username: sessionData.username,
        role: sessionData.role,
        lastActivity: Date.now(),  // reset inactivity timer
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('12h')
        .sign(encodedKey)

    const cookieStore = await cookies()
    cookieStore.set('session', newSession, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: expiresAt,
        maxAge: SESSION_MAX_AGE_MS / 1000,
        sameSite: 'lax',
        path: '/',
    })
}

export async function deleteSession() {
    const cookieStore = await cookies()
    cookieStore.set('session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: new Date(0),
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
    })
}
