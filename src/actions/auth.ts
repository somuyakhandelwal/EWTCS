'use server'

import { z } from 'zod'
import { createSession } from '@/lib/session'
import pool from '@/db'
import bcrypt from 'bcrypt'
import { redirect } from 'next/navigation'

const loginSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
})

export async function login(prevState: any, formData: FormData) {
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

        await createSession(user.id, user.role)

    } catch (error) {
        console.error('Login error:', error)
        return { message: 'Internal server error' }
    }

    redirect('/dashboard')
}
