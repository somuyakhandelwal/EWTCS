import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { deleteSession, verifySession } from '@/shared/lib/session'
import { invalidateToken } from '@/shared/lib/auth-service'
import { logAudit } from '@/shared/lib/audit'
import { getClientIpFromHeaders } from '@/shared/lib/request-ip'
import { logger } from '@/shared/config/logger'

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('session')?.value
        const ipAddress = getClientIpFromHeaders(request.headers)

        if (token) {
            // Get user details for audit logs before invalidating
            const session = await verifySession()

            // Invalidate the token (blacklist it)
            await invalidateToken(token)

            // Log the logout action
            if (session) {
                await logAudit({
                    actionType: 'LOGOUT',
                    entityType: 'user',
                    entityId: session.userId,
                    performedBy: session.userId,
                    reason: 'User initiated logout',
                    metadata: {
                        username: session.username,
                        role: session.role
                    },
                    ipAddress,
                })
            }
        }

        // Clear the session cookie
        await deleteSession()

        return NextResponse.json({ success: true })
    } catch (error) {
        logger.error('Logout failed', error instanceof Error ? error : undefined)
        // Always return success to ensure client cleans up
        return NextResponse.json({ success: true })
    }
}
