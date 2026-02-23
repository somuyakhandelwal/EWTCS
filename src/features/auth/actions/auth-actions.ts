'use server'

import { createSession, type KioskOptions } from '@/shared/lib/session'
import { loginSchema } from '../lib/auth-schema'
import pool from '@/shared/lib/db'
import bcrypt from 'bcrypt'
import { logAudit } from '@/shared/lib/audit'
import { headers } from 'next/headers'
import { createKioskSession } from '@/features/auth/lib/kiosk'
import { getClientIpFromHeaders } from '@/shared/lib/request-ip'
import { logger } from '@/shared/config/logger'
import { getPasswordResetStatus } from '@/features/auth/lib/password-reset-db'
import { handleUserRedirect, logUnknownLoginAttempt, isRedirectError } from '../lib/auth-helpers'
import { redirect } from 'next/navigation'

export async function login(prevState: unknown, formData: FormData) {
    const result = loginSchema.safeParse(Object.fromEntries(formData))
    if (!result.success) return { errors: result.error.flatten().fieldErrors }

    const { username, password } = result.data
    const ipAddress = getClientIpFromHeaders(await headers())

    try {
        const { rows } = await pool.query(
            `SELECT id, username, password_hash, role, is_active, failed_login_attempts, lockout_until, ward_id
       FROM users WHERE username = $1`,
            [username]
        )
        const user = rows[0]

        if (!user) {
            await logUnknownLoginAttempt(username, ipAddress ?? 'unknown')
            return { message: 'Invalid credentials' }
        }

        if (!user.is_active) {
            await logAudit({ actionType: 'LOGIN_BLOCKED', entityType: 'user', entityId: user.id, performedBy: user.id, reason: 'Login blocked: account deactivated', metadata: { username: user.username, role: user.role }, ipAddress })
            return { message: 'Account is deactivated. Contact administrator.' }
        }

        if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
            const remaining = Math.ceil((new Date(user.lockout_until).getTime() - Date.now()) / 60000)
            await logAudit({ actionType: 'LOGIN_BLOCKED', entityType: 'user', entityId: user.id, performedBy: user.id, reason: 'Login blocked: account lockout active', metadata: { username: user.username, role: user.role, lockoutUntil: user.lockout_until }, ipAddress })
            return { message: `Account locked. Try again in ${remaining} minutes.` }
        }

        if (!(await bcrypt.compare(password, user.password_hash))) {
            const attempts = (user.failed_login_attempts || 0) + 1
            const lockoutUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60000) : null
            await pool.query('UPDATE users SET failed_login_attempts = $1, lockout_until = $2, updated_at = NOW() WHERE id = $3', [attempts, lockoutUntil, user.id])
            await logAudit({ actionType: 'LOGIN_FAILED', entityType: 'user', entityId: user.id, performedBy: user.id, reason: lockoutUntil ? 'Login failed: invalid password, account locked' : 'Login failed: invalid password', metadata: { username: user.username, role: user.role, failedAttempts: attempts, lockoutUntil }, ipAddress })
            return { message: 'Invalid credentials' }
        }

        await pool.query('UPDATE users SET failed_login_attempts = 0, lockout_until = NULL, updated_at = NOW() WHERE id = $1', [user.id])

        const { mustChangePassword, tempPasswordSetAt } = await getPasswordResetStatus(user.id)
        if (mustChangePassword) {
            if (tempPasswordSetAt && (Date.now() - new Date(tempPasswordSetAt).getTime() > 24 * 60 * 60 * 1000)) {
                return { message: 'Temporary password has expired. Contact your administrator.' }
            }
            await createSession(user.id, user.username, user.role)
            redirect('/change-password')
        }

        let kioskOpts: KioskOptions | undefined
        if (formData.get('kioskMode') === 'on') {
            const headerStore = await headers()
            const boundIp = headerStore.get('x-forwarded-for')?.split(',')[0].trim() ?? headerStore.get('x-real-ip') ?? 'unknown'
            const kioskSessionId = await createKioskSession(user.id, boundIp)
            kioskOpts = { isKiosk: true, kioskIp: boundIp, kioskSessionId }
        }

        await createSession(user.id, user.username, user.role, kioskOpts)
        await logAudit({ actionType: 'LOGIN', entityType: 'user', entityId: user.id, performedBy: user.id, reason: 'User authenticated successfully', metadata: { username: user.username, role: user.role }, ipAddress })
        handleUserRedirect(user.role)
    } catch (error) {
        if (isRedirectError(error)) throw error
        logger.error('Login error', error instanceof Error ? error : undefined)
        return { message: 'Internal server error' }
    }
}
