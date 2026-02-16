import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySession } from '@/features/auth/lib/session'

export async function middleware(request: NextRequest) {
    const session = await verifySession()

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
