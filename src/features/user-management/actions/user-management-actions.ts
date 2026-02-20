'use server'

import { logger } from '@/shared/config/logger'
import { 
    createUserSchema, 
    updateUserSchema, 
    deactivateUserSchema
} from '@/features/user-management/schemas/user-schemas'
import { requireAdminWrite } from '@/features/user-management/lib/auth'
import { requireRole } from '@/shared/lib/auth'
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

export async function createUser(prevState: unknown, formData: FormData) {
    try {
        const session = await requireAdminWrite({
            actionType: 'CREATE',
            entityType: 'user',
            entityId: 'new',
        })

        // Validate input
        const result = createUserSchema.safeParse({
            username: formData.get('username'),
            password: formData.get('password'),
            role: formData.get('role'),
            wardId: (formData.get('wardId') as string) || null,
        })

        if (!result.success) {
            return {
                success: false,
                errors: result.error.flatten().fieldErrors,
            }
        }

        const { username, password, role, wardId } = result.data

        // Create user in database
        const newUser = await createUserInDB(username, password, role, wardId)

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

export async function updateUser(prevState: unknown, formData: FormData) {
    try {
        const session = await requireAdminWrite({
            actionType: 'UPDATE',
            entityType: 'user',
            entityId: formData.get('userId') as string || 'unknown',
        })

        // Validate input
        const result = updateUserSchema.safeParse({
            userId: formData.get('userId'),
            username: formData.get('username') || undefined,
            password: formData.get('password') || undefined,
            role: formData.get('role') || undefined,
            wardId: formData.has('wardId') ? ((formData.get('wardId') as string) || null) : undefined,
        })

        if (!result.success) {
            return {
                success: false,
                errors: result.error.flatten().fieldErrors,
            }
        }

        const { userId, username, password, role, wardId } = result.data

        // Update user in database
        const changes = await updateUserInDB(userId, username, password, role, wardId)

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

export async function deactivateUser(userId: string, reason?: string) {
    try {
        const session = await requireAdminWrite({
            actionType: 'DEACTIVATE',
            entityType: 'user',
            entityId: userId,
        })
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

export async function activateUser(userId: string) {
    try {
        const session = await requireAdminWrite({
            actionType: 'ACTIVATE',
            entityType: 'user',
            entityId: userId,
        })
        await activateUserInDB(userId)
        await logUserAction('ACTIVATE', userId, session.userId)
        logger.info('User activated', { userId })

        return { success: true, message: 'User activated successfully' }
    } catch (error) {
        logger.error('Failed to activate user', error as Error)
        return { success: false, message: 'Failed to activate user' }
    }
}

export async function getAllUsers() {
    try {
        await requireRole(['admin', 'supervisor'])
        const users = await getAllUsersQuery()
        return { success: true, users }
    } catch (error) {
        logger.error('Failed to fetch users', error as Error)
        return { success: false, message: 'Failed to fetch users', users: [] }
    }
}

export async function getUserLogs(userId?: string) {
    try {
        await requireRole(['admin', 'supervisor'])
        const logs = await getUserLogsQuery(userId)
        return { success: true, logs }
    } catch (error) {
        logger.error('Failed to fetch user logs', error as Error)
        return { success: false, message: 'Failed to fetch logs', logs: [] }
    }
}
