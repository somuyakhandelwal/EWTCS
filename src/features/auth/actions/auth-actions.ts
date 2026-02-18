'use server'

import { z } from 'zod'
import { createSession, deleteSession } from '@/features/auth/lib/session'
import pool from '@/shared/lib/db'
import bcrypt from 'bcrypt'
import { redirect } from 'next/navigation'

const loginSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
})

export async function login(prevState: unknown, formData: FormData) {
    // Validate form fields
    const result = loginSchema.safeParse(Object.fromEntries(formData))

    if (!result.success) {
        return {
            errors: result.error.flatten().fieldErrors,
        }
    }

    const { username, password } = result.data

    try {

        const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username])
        const user = rows[0]

        if (!user) {

            // Don't reveal user existence
            return { message: 'Invalid credentials' }
        }

        // CRITICAL: Check if user account is active
        // US-5.7 Acceptance Criteria: "Deactivated users cannot log in"
        if (!user.is_active) {
            return { message: 'Account is deactivated. Contact administrator.' }
        }

        // Check for lockout
        if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
            const remaining = Math.ceil((new Date(user.lockout_until).getTime() - Date.now()) / 60000)
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

            return { message: 'Invalid credentials' }
        }

        // Reset failed attempts on success
        await pool.query(
            'UPDATE users SET failed_login_attempts = 0, lockout_until = NULL, updated_at = NOW() WHERE id = $1',
            [user.id]
        )

        await createSession(user.id, user.username, user.role)

        // Redirect based on role
        if (user.role === 'admin') {
            redirect('/admin')
        } else if (user.role === 'supervisor') {
            redirect('/supervisor')
        } else {
            redirect('/dashboard')
        }
    } catch (error) {
        // If it's a redirect error, re-throw it so Next.js handles it
        if (error && typeof error === 'object' && 'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
            throw error
        }
        console.error('Login error:', error)
        return { message: 'Internal server error' }
    }
}

export async function logout() {
    await deleteSession()
    redirect('/login')
}
