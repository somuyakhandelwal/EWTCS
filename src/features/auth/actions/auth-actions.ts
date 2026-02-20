'use server'

import { createSession, type KioskOptions } from '@/shared/lib/session'
import { UNKNOWN_ACTOR_ID, loginSchema } from '../lib/auth-schema'
import pool from '@/shared/lib/db'
import bcrypt from 'bcrypt'
import { redirect } from 'next/navigation'
import { logAudit } from '@/shared/lib/audit'
import { headers } from 'next/headers'
import { createKioskSession } from '@/features/auth/lib/kiosk'
import { getClientIpFromHeaders } from '@/shared/lib/request-ip'
import { logger } from '@/shared/config/logger'
import { getPasswordResetStatus } from '@/features/auth/lib/password-reset-db'

export async function login(prevState: unknown, formData: FormData) {
    // Validate form fields
    const result = loginSchema.safeParse(Object.fromEntries(formData))

    if (!result.success) {
        return {
            errors: result.error.flatten().fieldErrors,
        }
    }

    const { username, password } = result.data
    const requestHeaders = await headers()
    const ipAddress = getClientIpFromHeaders(requestHeaders)

    try {
        const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username])
        const user = rows[0]

        if (!user) {
            // Audit best-effort: UNKNOWN_ACTOR_ID has no users row so INSERT may fail — swallow to avoid leaking errors.
            try {
                await logAudit({
                    actionType: 'LOGIN_FAILED',
                    entityType: 'auth',
                    entityId: UNKNOWN_ACTOR_ID,
                    performedBy: UNKNOWN_ACTOR_ID,
                    reason: 'Login failed: user not found',
                    metadata: {
                        username,
                    },
                    ipAddress,
                })
            } catch (_auditErr) {
                logger.warn('Could not write audit log for unknown-user login attempt', { username })
            }

            // Don't reveal user existence
            return { message: 'Invalid credentials' }
        }

        // CRITICAL: Check if user account is active
        // US-5.7 Acceptance Criteria: "Deactivated users cannot log in"
        if (!user.is_active) {
            await logAudit({
                actionType: 'LOGIN_BLOCKED',
                entityType: 'user',
                entityId: user.id,
                performedBy: user.id,
                reason: 'Login blocked: account deactivated',
                metadata: {
                    username: user.username,
                    role: user.role,
                },
                ipAddress,
            })

            return { message: 'Account is deactivated. Contact administrator.' }
        }

        // Check for lockout
        if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
            const remaining = Math.ceil((new Date(user.lockout_until).getTime() - Date.now()) / 60000)
            await logAudit({
                actionType: 'LOGIN_BLOCKED',
                entityType: 'user',
                entityId: user.id,
                performedBy: user.id,
                reason: 'Login blocked: account lockout active',
                metadata: {
                    username: user.username,
                    role: user.role,
                    lockoutUntil: user.lockout_until,
                },
                ipAddress,
            })

            return { message: `Account locked. Try again in ${remaining} minutes.` }
        }

        const passwordsMatch = await bcrypt.compare(password, user.password_hash)

        if (!passwordsMatch) {
            // Increment failed attempts
            const attempts = (user.failed_login_attempts || 0) + 1
            let lockoutUntil = null

            if (attempts >= 5) {
                lockoutUntil = new Date(Date.now() + 15 * 60000) // 15 mins lock
            }

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
                metadata: {
                    username: user.username,
                    role: user.role,
                    failedAttempts: attempts,
                    lockoutUntil,
                },
                ipAddress,
            })

            return { message: 'Invalid credentials' }
        }

        // Reset failed attempts on success
        await pool.query(
            'UPDATE users SET failed_login_attempts = 0, lockout_until = NULL, updated_at = NOW() WHERE id = $1',
            [user.id]
        )

        // US-5.5: Check if user must change their password before accessing the app
        const { mustChangePassword, tempPasswordSetAt } = await getPasswordResetStatus(user.id)

        if (mustChangePassword) {
            const TEMP_PASSWORD_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours
            const isExpired =
                tempPasswordSetAt !== null &&
                Date.now() - new Date(tempPasswordSetAt).getTime() > TEMP_PASSWORD_EXPIRY_MS

            if (isExpired) {
                return {
                    message:
                        'Temporary password has expired. Contact your administrator to reset your password.',
                }
            }

            // Create a normal session (no flag in JWT) and redirect to the
            // change-password page. The page itself verifies the DB flag.
            await createSession(user.id, user.username, user.role)
            redirect('/change-password')
        }
        const isKiosk = formData.get('kioskMode') === 'on'
        let kioskOpts: KioskOptions | undefined
        if (isKiosk) {
            const headerStore = await headers()
            const boundIp = headerStore.get('x-forwarded-for')?.split(',')[0].trim()
                ?? headerStore.get('x-real-ip')
                ?? 'unknown'
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
            metadata: {
                username: user.username,
                role: user.role,
            },
            ipAddress,
        })

        // Redirect based on role
        if (user.role === 'admin') {
            redirect('/admin')
        } else if (user.role === 'supervisor') {
            redirect('/supervisor')
        } else if (user.role === 'auditor') {
            redirect('/analytics')
        } else {
            redirect('/dashboard')
        }
    } catch (error) {
        // If it's a redirect error, re-throw it so Next.js handles it
        if (error && typeof error === 'object' && 'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
            throw error
        }
        logger.error('Login error', error instanceof Error ? error : undefined)
        return { message: 'Internal server error' }
    }
}
