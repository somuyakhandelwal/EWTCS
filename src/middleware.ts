import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secretKey = process.env.SESSION_SECRET
const encodedKey = new TextEncoder().encode(secretKey!)
const INACTIVITY_TIMEOUT_MS = Number(process.env.INACTIVITY_TIMEOUT_MS) || 30 * 60 * 1000

function isLocalHost(hostname: string) {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

function shouldEnforceHttps() {
    const env = (process.env.NODE_ENV as string | undefined) ?? ''  
    const enforceableEnv = env === 'production' || env === 'staging'
    if (!enforceableEnv) return false
    return process.env.FORCE_HTTPS !== 'false'
}

function isSecureRequest(request: NextRequest) {
    const forwardedProto = request.headers
        .get('x-forwarded-proto')
        ?.split(',')[0]
        ?.trim()
        ?.toLowerCase()

    if (forwardedProto) {
        return forwardedProto === 'https'
    }

    return request.nextUrl.protocol === 'https:'
}

export async function middleware(request: NextRequest) {
    // EPIC 17 / US-17.1: Enforce HTTPS on all matched routes in staging/production.
    // This protects pages and API routes behind this middleware from plaintext transport.
    if (shouldEnforceHttps() && !isLocalHost(request.nextUrl.hostname) && !isSecureRequest(request)) {
        const httpsUrl = request.nextUrl.clone()
        httpsUrl.protocol = 'https:'
        return NextResponse.redirect(httpsUrl, 308)
    }

    const token = request.cookies.get('session')?.value

    let session = null

    if (token) {
        try {
            const { payload } = await jwtVerify(token, encodedKey, {
                algorithms: ['HS256'],
            })

            // US-5.2 AC-4: Check inactivity timeout in middleware
            const lastActivity = (payload.lastActivity as number) || Date.now()
            if (Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS) {
                // Idle timeout — treat as no session
                session = null
            } else {
                session = payload
            }
        } catch {
            session = null
        }
    }

    const { pathname } = request.nextUrl

    // US-5.3: Kiosk IP binding — if the session was created in kiosk mode,
    // reject any request coming from a different IP address.
    if (session?.isKiosk && session.kioskIp && session.kioskIp !== 'unknown') {
        const clientIp =
            request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
        if (clientIp !== session.kioskIp) {
            const res = NextResponse.redirect(new URL('/login', request.url))
            res.cookies.delete('session')
            return res
        }
    }

    // US-5.5: /change-password requires an active session
    if (pathname.startsWith('/change-password')) {
        if (!session) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    // Protected routes
    if (pathname.startsWith('/admin')) {
        if (!session || session.role !== 'admin') {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    if (pathname.startsWith('/supervisor')) {
        if (!session || (session.role !== 'supervisor' && session.role !== 'admin')) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    // Bed grid: accessible to all operational roles (nurse, housekeeping) and
    // oversight roles (supervisor, admin) who may need direct grid access.
    if (pathname.startsWith('/dashboard')) {
        const dashboardRoles = ['nurse', 'housekeeping', 'supervisor', 'admin', 'doctor']
        if (!session || !dashboardRoles.includes(session.role as string)) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    if (pathname.startsWith('/triage')) {
        const triageRoles = ['nurse', 'housekeeping', 'supervisor', 'admin']
        if (!session || !triageRoles.includes(session.role as string)) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    // Analytics: supervisor, admin, and auditor
    if (pathname.startsWith('/analytics')) {
        if (!session || (session.role !== 'supervisor' && session.role !== 'admin' && session.role !== 'auditor')) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    // Cath Lab: dedicated cardiology procedure logging workflow
    if (pathname.startsWith('/cath-lab')) {
        const cathLabRoles = ['cardiologist', 'cath_lab_nurse', 'nurse', 'supervisor', 'admin']
        if (!session || !cathLabRoles.includes(session.role as string)) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    // Already logged in — redirect away from login
    if (pathname.startsWith('/login')) {
        if (session) {
            if (session.role === 'admin') return NextResponse.redirect(new URL('/admin', request.url))
            if (session.role === 'supervisor') return NextResponse.redirect(new URL('/supervisor', request.url))
            if (session.role === 'auditor') return NextResponse.redirect(new URL('/analytics', request.url))
            if (session.role === 'cardiologist' || session.role === 'cath_lab_nurse') {
                return NextResponse.redirect(new URL('/cath-lab', request.url))
            }
            // nurse, housekeeping, and doctor all use the bed grid dashboard
            if (session.role === 'nurse' || session.role === 'housekeeping' || session.role === 'doctor') {
                return NextResponse.redirect(new URL('/dashboard', request.url))
            }
            // Fallback: unknown future roles go to login (do not silently grant access)
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    // API routes — require an authenticated session.
    // Exceptions: /api/auth/* (login/logout), /api/health, /api/cron/*
    // (cron uses its own CRON_SECRET Bearer-token auth).
    if (pathname.startsWith('/api/')) {
        const isPublicApi =
            pathname.startsWith('/api/auth/') ||
            pathname.startsWith('/api/health') ||
            pathname.startsWith('/api/cron/') ||
            pathname.startsWith('/api/external/')
        if (!isPublicApi && !session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    return NextResponse.next()
}

export const config = {
    // Matches all routes except Next.js internals and static assets.
    // Route-level auth checks (pages + /api/*) are handled inside the middleware function.
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
    ],
}
