'use server'

import bcrypt from 'bcrypt'
import pool from '@/db'
import { logger } from '@/lib/config/logger'
import { 
    createUserSchema, 
    updateUserSchema, 
    deactivateUserSchema,
    type CreateUserInput,
    type UpdateUserInput,
    type DeactivateUserInput
} from '@/lib/user-management/schemas'
import { requireAdmin } from '@/lib/user-management/auth'
import { logUserAction } from '@/lib/user-management/audit'
import { 
    getAllUsers as getAllUsersQuery, 
    getUserLogs as getUserLogsQuery 
} from '@/lib/user-management/queries'

/**
 * Create a new user
 * US-5.3: Admin can create new users with username, password, role
 */
export async function createUser(prevState: unknown, formData: FormData) {
    try {
        const session = await requireAdmin()

        // Validate input
        const result = createUserSchema.safeParse({
            username: formData.get('username'),
            password: formData.get('password'),
            role: formData.get('role'),
        })

        if (!result.success) {
            return {
                success: false,
                errors: result.error.flatten().fieldErrors,
            }
        }

        const { username, password, role } = result.data

        // Check if username already exists
        const existing = await pool.query(
            'SELECT id FROM users WHERE username = $1',
            [username]
        )

        if (existing.rows.length > 0) {
            return {
                success: false,
                message: 'Username already exists',
            }
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10)

        // Insert user
        const insertResult = await pool.query(
            `INSERT INTO users (username, password_hash, role, is_active) 
            VALUES ($1, $2, $3, TRUE) 
            RETURNING id, username, role`,
            [username, passwordHash, role]
        )

        const newUser = insertResult.rows[0]

        // Log action
        await logUserAction('CREATE', newUser.id, session.userId, {
            username,
            role,
        })

        logger.info('User created successfully', { username, role })

        return {
            success: true,
            message: 'User created successfully',
            user: newUser,
        }
    } catch (error) {
        logger.error('Failed to create user', error as Error)
        return {
            success: false,
            message: 'Failed to create user',
        }
    }
}

/**
 * Update user details (username, password, role)
 * US-5.3: Admin can edit user details and roles
 */
export async function updateUser(prevState: unknown, formData: FormData) {
    try {
        const session = await requireAdmin()

        // Validate input
        const result = updateUserSchema.safeParse({
            userId: formData.get('userId'),
            username: formData.get('username') || undefined,
            password: formData.get('password') || undefined,
            role: formData.get('role') || undefined,
        })

        if (!result.success) {
            return {
                success: false,
                errors: result.error.flatten().fieldErrors,
            }
        }

        const { userId, username, password, role } = result.data
        const changes: Record<string, unknown> = {}
        const updates: string[] = []
        const values: unknown[] = []
        let paramIndex = 1

        // Build dynamic update query
        if (username) {
            updates.push(`username = $${paramIndex++}`)
            values.push(username)
            changes.username = username
        }

        if (password) {
            const passwordHash = await bcrypt.hash(password, 10)
            updates.push(`password_hash = $${paramIndex++}`)
            values.push(passwordHash)
            changes.password = 'changed'
        }

        if (role) {
            updates.push(`role = $${paramIndex++}`)
            values.push(role)
            changes.role = role
        }

        if (updates.length === 0) {
            return {
                success: false,
                message: 'No fields to update',
            }
        }

        updates.push(`updated_at = NOW()`)
        values.push(userId)

        await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
            values
        )

        // Log action
        await logUserAction('UPDATE', userId, session.userId, changes)

        logger.info('User updated successfully', { userId, changes })

        return {
            success: true,
            message: 'User updated successfully',
        }
    } catch (error) {
        logger.error('Failed to update user', error as Error)
        return {
            success: false,
            message: 'Failed to update user',
        }
    }
}

/**
 * Deactivate a user account
 * US-5.3: Admin can deactivate (not delete) users
 * US-5.3: Deactivated users cannot log in
 */
export async function deactivateUser(userId: string, reason?: string) {
    try {
        const session = await requireAdmin()

        const result = deactivateUserSchema.safeParse({ userId, reason })
        if (!result.success) {
            return {
                success: false,
                message: 'Invalid user ID',
            }
        }

        await pool.query(
            'UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1',
            [userId]
        )

        await logUserAction('DEACTIVATE', userId, session.userId, {}, reason)

        logger.info('User deactivated', { userId, reason })

        return {
            success: true,
            message: 'User deactivated successfully',
        }
    } catch (error) {
        logger.error('Failed to deactivate user', error as Error)
        return {
            success: false,
            message: 'Failed to deactivate user',
        }
    }
}

/**
 * Activate a user account
 */
export async function activateUser(userId: string) {
    try {
        const session = await requireAdmin()

        await pool.query(
            'UPDATE users SET is_active = TRUE, updated_at = NOW() WHERE id = $1',
            [userId]
        )

        await logUserAction('ACTIVATE', userId, session.userId)

        logger.info('User activated', { userId })

        return {
            success: true,
            message: 'User activated successfully',
        }
    } catch (error) {
        logger.error('Failed to activate user', error as Error)
        return {
            success: false,
            message: 'Failed to activate user',
        }
    }
}

/**
 * Get all users with their details
 * Epic 5: US-5.3 - User Management
 */
export async function getAllUsers() {
    try {
        const users = await getAllUsersQuery()
        return {
            success: true,
            users,
        }
    } catch (error) {
        logger.error('Failed to fetch users', error as Error)
        return {
            success: false,
            message: 'Failed to fetch users',
            users: [],
        }
    }
}

/**
 * Get user management logs for audit trail
 * Epic 5: US-5.3 - User Management
 * US-5.3 Acceptance Criteria: "User management actions are logged"
 */
export async function getUserLogs(userId?: string) {
    try {
        const logs = await getUserLogsQuery(userId)
        return {
            success: true,
            logs,
        }
    } catch (error) {
        logger.error('Failed to fetch user logs', error as Error)
        return {
            success: false,
            message: 'Failed to fetch logs',
            logs: [],
        }
    }
}
