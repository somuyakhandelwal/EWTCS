import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { logger } from '@/shared/config/logger'

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
    if (shouldEnforceHttps() && !isLocalHost(request.nextUrl.hostname) && !isSecureRequest(request)) {
        const httpsUrl = request.nextUrl.clone()
        httpsUrl.protocol = 'https:'
        return NextResponse.redirect(httpsUrl, 308)
    }

    const token = request.cookies.get('session')?.value
    let session: Record<string, unknown> | null = null

    if (token) {
        try {
            const { payload } = await jwtVerify(token, encodedKey, {
                algorithms: ['HS256'],
            })

            const lastActivity = (payload.lastActivity as number) || Date.now()
            if (!payload.isKiosk && Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS) {
                session = null
            } else {
                session = payload
            }
        } catch {
            session = null
        }
    }

    const getRoutingResponse = () => {
        const { pathname } = request.nextUrl

        if (session?.isKiosk && session.kioskIp && session.kioskIp !== 'unknown') {
            const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
            if (clientIp !== session.kioskIp) {
                const res = NextResponse.redirect(new URL('/login', request.url))
                res.cookies.delete('session')
                return res
            }
        }

        if (pathname.startsWith('/change-password') && !session) {
            return NextResponse.redirect(new URL('/login', request.url))
        }

        if (pathname.startsWith('/admin') && (!session || session.role !== 'admin')) {
            return NextResponse.redirect(new URL('/login', request.url))
        }

        if (pathname.startsWith('/supervisor') && (!session || (session.role !== 'supervisor' && session.role !== 'admin'))) {
            return NextResponse.redirect(new URL('/login', request.url))
        }

        if (pathname.startsWith('/dashboard')) {
            const dashboardRoles = ['nurse', 'housekeeping', 'supervisor', 'admin']
            if (!session || !dashboardRoles.includes(session.role as string)) {
                return NextResponse.redirect(new URL('/login', request.url))
            }
        }

        if (pathname.startsWith('/analytics') && (!session || (session.role !== 'supervisor' && session.role !== 'admin' && session.role !== 'auditor'))) {
            return NextResponse.redirect(new URL('/login', request.url))
        }

        if (pathname.startsWith('/login') && session) {
            if (session.role === 'admin') return NextResponse.redirect(new URL('/admin', request.url))
            if (session.role === 'supervisor') return NextResponse.redirect(new URL('/supervisor', request.url))
            if (session.role === 'auditor') return NextResponse.redirect(new URL('/analytics', request.url))
            if (session.role === 'nurse' || session.role === 'housekeeping') return NextResponse.redirect(new URL('/dashboard', request.url))
            return NextResponse.redirect(new URL('/login', request.url))
        }

        return NextResponse.next()
    }

    const response = getRoutingResponse()

    if (session?.isKiosk && !request.cookies.has('kiosk_browser_session')) {
        logger.info('Kiosk session restored automatically after browser restart', {
            userId: session.userId,
            kioskIp: session.kioskIp,
            event: 'kiosk_session_restored'
        })
        response.cookies.set('kiosk_browser_session', 'active', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
        })
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
    ],
}
