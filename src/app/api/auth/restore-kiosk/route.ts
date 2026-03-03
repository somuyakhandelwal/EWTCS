import { NextResponse } from 'next/server'
import { z } from 'zod'
import pool from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import { createSession, type KioskOptions } from '@/shared/lib/session'
import { logAudit } from '@/shared/lib/audit'
import { headers } from 'next/headers'
import { getClientIpFromHeaders } from '@/shared/lib/request-ip'

const restoreSchema = z.object({
    kioskToken: z.string().uuid()
})

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const parsed = restoreSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json({ success: false, message: 'Invalid token format' }, { status: 400 })
        }

        const { kioskToken } = parsed.data

        // 1. Check if the kiosk session exists and is active
        const { rows: kioskRows } = await pool.query(
            'SELECT id, user_id, bound_ip FROM kiosk_sessions WHERE id = $1 AND is_active = true',
            [kioskToken]
        )

        if (kioskRows.length === 0) {
            return NextResponse.json({ success: false, message: 'Invalid or inactive kiosk session' }, { status: 401 })
        }

        const kioskSession = kioskRows[0]

        // 2. Fetch the user associated with this kiosk session
        const { rows: userRows } = await pool.query(
            'SELECT id, username, role, is_active, lockout_until FROM users WHERE id = $1',
            [kioskSession.user_id]
        )

        const user = userRows[0]

        if (!user || !user.is_active || (user.lockout_until && new Date(user.lockout_until) > new Date())) {
            return NextResponse.json({ success: false, message: 'User inactive or locked' }, { status: 403 })
        }

        // 3. Restore the session cookie
        const ipAddress = getClientIpFromHeaders(await headers())
        const kioskOpts: KioskOptions = {
            isKiosk: true,
            kioskIp: kioskSession.bound_ip,
            kioskSessionId: kioskSession.id
        }

        await createSession(user.id, user.username, user.role, kioskOpts)

        // 4. Log the session restoration
        await logAudit({
            actionType: 'LOGIN',
            entityType: 'user',
            entityId: user.id,
            performedBy: user.id,
            reason: 'Kiosk session restored automatically',
            metadata: { kioskSessionId: kioskSession.id },
            ipAddress
        })

        const redirectTo = user.role === 'admin'
            ? '/admin'
            : user.role === 'supervisor'
                ? '/supervisor'
                : '/dashboard'

        return NextResponse.json({ success: true, redirectTo })
    } catch (error) {
        logger.error('Kiosk restore API error', error instanceof Error ? error : undefined)
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
    }
}
