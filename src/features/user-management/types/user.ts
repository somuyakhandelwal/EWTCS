/**
 * TypeScript types for user management
 * Epic 5: US-5.3 - User Management
 */

export interface User {
    id: string
    username: string
    password_hash: string
    role: 'nurse' | 'supervisor' | 'admin'
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface UserSummary {
    id: string
    username: string
    role: 'nurse' | 'supervisor' | 'admin'
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface CreateUserInput {
    username: string
    password: string
    role: 'nurse' | 'supervisor' | 'admin'
}

export interface UpdateUserInput {
    username?: string
    password?: string
    role?: 'nurse' | 'supervisor' | 'admin'
}
