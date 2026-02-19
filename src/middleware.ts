import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySession } from '@/features/auth/lib/session'

export async function middleware(request: NextRequest) {
    const session = await verifySession()
    // Note: Token blacklist is checked in verifyActiveSession() within Server Components/Actions,
    // as Middleware runs on Edge and cannot access the database directly for blacklist checks.

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
    if (request.nextUrl.pathname.startsWith('/admin')) {
        if (!session || session.role !== 'admin') {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    if (request.nextUrl.pathname.startsWith('/supervisor')) {
        if (!session || session.role !== 'supervisor') {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    if (request.nextUrl.pathname.startsWith('/dashboard')) {
        if (!session || session.role !== 'nurse') {
            // Optional: Redirect to their correct dashboard if they are logged in but wrong role?
            // For now, strict block:
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    // Redirect if already logged in
    if (request.nextUrl.pathname.startsWith('/login')) {
        if (session) {
            if (session.role === 'admin') return NextResponse.redirect(new URL('/admin', request.url))
            if (session.role === 'supervisor') return NextResponse.redirect(new URL('/supervisor', request.url))
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/dashboard/:path*', '/admin/:path*', '/supervisor/:path*', '/login'],
}
