import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import pool from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import { createSession, type KioskOptions } from '@/shared/lib/session'
import { createKioskSession } from '@/features/auth/lib/kiosk'
import { logAudit } from '@/shared/lib/audit'
import { getPasswordResetStatus } from '@/features/auth/lib/password-reset-db'
import { logUnknownLoginAttempt } from '@/features/auth/lib/auth-helpers'

export const dynamic = 'force-dynamic'

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  kioskMode: z.boolean().optional().default(false),
})

const ROLE_REDIRECT: Record<string, string> = {
  admin: '/admin',
  supervisor: '/supervisor',
  auditor: '/analytics',
  cardiologist: '/cath-lab',
  cath_lab_nurse: '/cath-lab',
}

// ── IP-based rate limiting ─────────────────────────────────────────────────
// Protects the login endpoint from high-volume brute force before DB lockout
// kicks in. Max MAX_REQUESTS attempts per IP within WINDOW_MS.
const WINDOW_MS = 60_000      // 1 minute window
const MAX_REQUESTS = 10        // max login attempts per IP per window

const ipHits = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = ipHits.get(ip)

  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true // allowed
  }

  entry.count += 1
  if (entry.count > MAX_REQUESTS) {
    return false // rate limited
  }
  return true
}

export async function POST(request: NextRequest) {
  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  // Reject before even parsing the body if IP is hammering us
  if (!checkRateLimit(ipAddress)) {
    logger.warn('Login rate limit exceeded', { ipAddress })
    return NextResponse.json(
      { success: false, message: 'Too many login attempts. Please wait a minute.' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { username, password, kioskMode } = parsed.data

    // Explicit column list — never SELECT * — to prevent password_hash
    // from being carried into downstream objects unintentionally.
    const { rows } = await pool.query(
      `SELECT id, username, password_hash, role, is_active,
              failed_login_attempts, lockout_until, ward_id
       FROM users WHERE username = $1`,
      [username]
    )
    const user = rows[0]

    if (!user) {
      await logUnknownLoginAttempt(username, ipAddress)
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 })
    }

    if (!user.is_active) {
      await logAudit({
        actionType: 'LOGIN_BLOCKED',
        entityType: 'user',
        entityId: user.id,
        performedBy: user.id,
        reason: 'Login blocked: account deactivated',
        metadata: { username: user.username, role: user.role },
        ipAddress,
      })
      return NextResponse.json(
        { success: false, message: 'Account is deactivated. Contact administrator.' },
        { status: 403 }
      )
    }

    if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
      const remaining = Math.ceil((new Date(user.lockout_until).getTime() - Date.now()) / 60000)
      await logAudit({
        actionType: 'LOGIN_BLOCKED',
        entityType: 'user',
        entityId: user.id,
        performedBy: user.id,
        reason: 'Login blocked: account lockout active',
        metadata: { username: user.username, role: user.role, lockoutUntil: user.lockout_until },
        ipAddress,
      })
      return NextResponse.json(
        { success: false, message: `Account locked. Try again in ${remaining} minutes.` },
        { status: 423 }
      )
    }

    const passwordsMatch = await bcrypt.compare(password, user.password_hash)

    if (!passwordsMatch) {
      const attempts = (user.failed_login_attempts || 0) + 1
      const lockoutUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60000) : null

      await pool.query(
        'UPDATE users SET failed_login_attempts = $1, lockout_until = $2, updated_at = NOW() WHERE id = $3',
        [attempts, lockoutUntil, user.id]
      )
      await logAudit({
        actionType: 'LOGIN_FAILED',
        entityType: 'user',
        entityId: user.id,
        performedBy: user.id,
        reason: lockoutUntil
          ? 'Login failed: invalid password, account locked'
          : 'Login failed: invalid password',
        metadata: { username: user.username, role: user.role, failedAttempts: attempts, lockoutUntil },
        ipAddress,
      })
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 })
    }

    await pool.query(
      'UPDATE users SET failed_login_attempts = 0, lockout_until = NULL, updated_at = NOW() WHERE id = $1',
      [user.id]
    )

    // Enforce temporary password change before granting full session
    const { mustChangePassword, tempPasswordSetAt } = await getPasswordResetStatus(user.id)
    if (mustChangePassword) {
      if (
        tempPasswordSetAt &&
        Date.now() - new Date(tempPasswordSetAt).getTime() > 24 * 60 * 60 * 1000
      ) {
        return NextResponse.json(
          { success: false, message: 'Temporary password has expired. Contact your administrator.' },
          { status: 403 }
        )
      }
      await createSession(user.id, user.username, user.role)
      return NextResponse.json({ success: true, redirectTo: '/change-password' })
    }

    let kioskOpts: KioskOptions | undefined
    if (kioskMode) {
      const boundIp =
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
        request.headers.get('x-real-ip') ??
        'unknown'
      const kioskSessionId = await createKioskSession(user.id, boundIp)
      kioskOpts = { isKiosk: true, kioskIp: boundIp, kioskSessionId }
    }

    await createSession(user.id, user.username, user.role, kioskOpts)
    await logAudit({
      actionType: 'LOGIN',
      entityType: 'user',
      entityId: user.id,
      performedBy: user.id,
      reason: 'User authenticated successfully',
      metadata: { username: user.username, role: user.role },
      ipAddress,
    })

    const redirectTo = ROLE_REDIRECT[user.role] ?? '/dashboard'
    return NextResponse.json({ success: true, redirectTo })
  } catch (error) {
    logger.error('Login API error', error instanceof Error ? error : undefined)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
