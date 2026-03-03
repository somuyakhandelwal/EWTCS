import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import pool from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import { createSession, type KioskOptions } from '@/shared/lib/session'
import { createKioskSession } from '@/features/auth/lib/kiosk'

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  kioskMode: z.boolean().optional().default(false),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { username, password, kioskMode } = parsed.data

    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username])
    const user = rows[0]

    if (!user) {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 })
    }

    if (!user.is_active) {
      return NextResponse.json(
        { success: false, message: 'Account is deactivated. Contact administrator.' },
        { status: 403 }
      )
    }

    if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
      const remaining = Math.ceil((new Date(user.lockout_until).getTime() - Date.now()) / 60000)
      return NextResponse.json(
        { success: false, message: `Account locked. Try again in ${remaining} minutes.` },
        { status: 423 }
      )
    }

    const passwordsMatch = await bcrypt.compare(password, user.password_hash)

    if (!passwordsMatch) {
      const attempts = (user.failed_login_attempts || 0) + 1
      let lockoutUntil = null

      if (attempts >= 5) {
        lockoutUntil = new Date(Date.now() + 15 * 60000)
      }

      await pool.query(
        'UPDATE users SET failed_login_attempts = $1, lockout_until = $2, updated_at = NOW() WHERE id = $3',
        [attempts, lockoutUntil, user.id]
      )

      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 })
    }

    await pool.query(
      'UPDATE users SET failed_login_attempts = 0, lockout_until = NULL, updated_at = NOW() WHERE id = $1',
      [user.id]
    )

    let kioskOpts: KioskOptions | undefined
    if (kioskMode) {
      const boundIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
        ?? request.headers.get('x-real-ip')
        ?? 'unknown'
      const kioskSessionId = await createKioskSession(user.id, boundIp)
      kioskOpts = { isKiosk: true, kioskIp: boundIp, kioskSessionId }
    }

    await createSession(user.id, user.username, user.role, kioskOpts)

    const redirectTo = user.role === 'admin'
      ? '/admin'
      : user.role === 'supervisor'
        ? '/supervisor'
        : '/dashboard'

    return NextResponse.json({ success: true, redirectTo })
  } catch (error) {
    logger.error('Login API error', error instanceof Error ? error : undefined)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
