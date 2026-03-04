import { NextResponse } from 'next/server'
import { restoreKioskSession } from '@/features/auth/lib/kiosk'
import { logger } from '@/shared/config/logger'

export async function POST(request: Request) {
    try {
        const { token } = await request.json()

        if (!token) {
            return NextResponse.json({ success: false, message: 'No token provided' }, { status: 400 })
        }

        const session = await restoreKioskSession(token)

        if (!session) {
            return NextResponse.json({ success: false, message: 'Invalid or expired token' }, { status: 401 })
        }

        const redirectTo = session.role === 'admin'
            ? '/admin'
            : session.role === 'supervisor'
                ? '/supervisor'
                : '/dashboard'

        return NextResponse.json({ success: true, redirectTo })
    } catch (error) {
        logger.error('Session restoration API error', error instanceof Error ? error : undefined)
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
    }
}
