'use server'

import { logger } from '@/shared/config/logger'
import { 
    createUserSchema, 
    updateUserSchema, 
    deactivateUserSchema
} from '@/features/user-management/schemas/user-schemas'
import { requireAdmin } from '@/features/user-management/lib/auth'
import { logUserAction } from '@/features/user-management/lib/audit'
import { 
    getAllUsers as getAllUsersQuery, 
    getUserLogs as getUserLogsQuery 
} from '@/features/user-management/lib/queries'
import {
    createUserInDB,
    updateUserInDB,
    deactivateUserInDB,
    activateUserInDB
} from '@/features/user-management/lib/mutations'

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

        // Create user in database
        const newUser = await createUserInDB(username, password, role)

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
        const errorMessage = error instanceof Error ? error.message : 'Failed to create user'
        logger.error('Failed to create user', error as Error)
        return {
            success: false,
            message: errorMessage,
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

        // Update user in database
        const changes = await updateUserInDB(userId, username, password, role)

        // Log action
        await logUserAction('UPDATE', userId, session.userId, changes)

        logger.info('User updated successfully', { userId, changes })

        return {
            success: true,
            message: 'User updated successfully',
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update user'
        logger.error('Failed to update user', error as Error)
        return {
            success: false,
            message: errorMessage,
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
            return { success: false, message: 'Invalid user ID' }
        }

        await deactivateUserInDB(userId)
        await logUserAction('DEACTIVATE', userId, session.userId, {}, reason)
        logger.info('User deactivated', { userId, reason })

        return { success: true, message: 'User deactivated successfully' }
    } catch (error) {
        logger.error('Failed to deactivate user', error as Error)
        return { success: false, message: 'Failed to deactivate user' }
    }
}

/**
 * Activate a user account
 */
export async function activateUser(userId: string) {
    try {
        const session = await requireAdmin()
        await activateUserInDB(userId)
        await logUserAction('ACTIVATE', userId, session.userId)
        logger.info('User activated', { userId })

        return { success: true, message: 'User activated successfully' }
    } catch (error) {
        logger.error('Failed to activate user', error as Error)
        return { success: false, message: 'Failed to activate user' }
    }
}

/**
 * Get all users with their details
 * Epic 5: US-5.3 - User Management
 */
export async function getAllUsers() {
    try {
        const users = await getAllUsersQuery()
        return { success: true, users }
    } catch (error) {
        logger.error('Failed to fetch users', error as Error)
        return { success: false, message: 'Failed to fetch users', users: [] }
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
        return { success: true, logs }
    } catch (error) {
        logger.error('Failed to fetch user logs', error as Error)
        return { success: false, message: 'Failed to fetch logs', logs: [] }
    }
}
