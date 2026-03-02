import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secretKey = process.env.SESSION_SECRET
const encodedKey = new TextEncoder().encode(secretKey!)
const INACTIVITY_TIMEOUT_MS = Number(process.env.INACTIVITY_TIMEOUT_MS) || 30 * 60 * 1000

export async function middleware(request: NextRequest) {
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
        const dashboardRoles = ['nurse', 'housekeeping', 'supervisor', 'admin']
        if (!session || !dashboardRoles.includes(session.role as string)) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    // Analytics: supervisor, admin, and auditor
    if (pathname.startsWith('/analytics')) {
        if (!session || (session.role !== 'supervisor' && session.role !== 'admin' && session.role !== 'auditor')) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    // Already logged in — redirect away from login
    if (pathname.startsWith('/login')) {
        if (session) {
            if (session.role === 'admin') return NextResponse.redirect(new URL('/admin', request.url))
            if (session.role === 'supervisor') return NextResponse.redirect(new URL('/supervisor', request.url))
            if (session.role === 'auditor') return NextResponse.redirect(new URL('/analytics', request.url))
            // nurse and housekeeping both use the bed grid dashboard
            if (session.role === 'nurse' || session.role === 'housekeeping') {
                return NextResponse.redirect(new URL('/dashboard', request.url))
            }
            // Fallback: unknown future roles go to login (do not silently grant access)
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/admin/:path*',
        '/supervisor/:path*',
        '/analytics/:path*',
        '/login',
        '/change-password',
    ],
}
