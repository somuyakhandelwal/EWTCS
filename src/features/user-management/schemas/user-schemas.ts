import { z } from 'zod'

/**
 * Validation schema for creating a new user
 * Epic 5: US-5.3 - User Management
 */
export const createUserSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters').max(50),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['nurse', 'supervisor', 'admin', 'auditor']),
    wardId: z.string().uuid().nullable().optional(),
})

/**
 * Validation schema for updating user details
 */
export const updateUserSchema = z.object({
    userId: z.string().uuid(),
    username: z.string().min(3).max(50).optional(),
    password: z.string().min(6).optional(),
    role: z.enum(['nurse', 'supervisor', 'admin', 'auditor']).optional(),
    wardId: z.string().uuid().nullable().optional(),
})

/**
 * Validation schema for deactivating a user
 */
export const deactivateUserSchema = z.object({
    userId: z.string().uuid(),
    reason: z.string().optional(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type DeactivateUserInput = z.infer<typeof deactivateUserSchema>
