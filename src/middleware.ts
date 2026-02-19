import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySession, renewSession } from './features/auth/lib/session'

export async function middleware(request: NextRequest) {
    const session = await verifySession()

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

    // Protected routes
    if (pathname.startsWith('/admin')) {
        if (!session || session.role !== 'admin') {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    if (pathname.startsWith('/supervisor')) {
        if (!session || session.role !== 'supervisor') {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    if (pathname.startsWith('/dashboard')) {
        if (!session || session.role !== 'nurse') {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    // Analytics: supervisor and admin only
    if (pathname.startsWith('/analytics')) {
        if (!session || (session.role !== 'supervisor' && session.role !== 'admin')) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    // Already logged in — redirect away from login
    if (pathname.startsWith('/login')) {
        if (session) {
            if (session.role === 'admin') return NextResponse.redirect(new URL('/admin', request.url))
            if (session.role === 'supervisor') return NextResponse.redirect(new URL('/supervisor', request.url))
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }
    }

    const response = NextResponse.next()

    // Sliding window renewal: if we have a valid session, refresh it
    if (session) {
        const newToken = await renewSession(session)
        const expiresAt = session.isKiosk
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

        response.cookies.set('session', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            expires: expiresAt,
            sameSite: 'lax',
            path: '/',
        })
    }

    return response
}

export const config = {
    matcher: ['/dashboard/:path*', '/admin/:path*', '/supervisor/:path*', '/analytics/:path*', '/login'],
}
