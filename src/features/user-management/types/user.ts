/**
 * TypeScript types for user management
 * Epic 5: US-5.3 - User Management
 */

// US-12.3: 'auditor' is a read-only compliance role
export type UserRole = 'nurse' | 'supervisor' | 'admin' | 'auditor'

export interface User {
    id: string
    username: string
    password_hash: string
    role: UserRole
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface UserSummary {
    id: string
    username: string
    role: UserRole
    is_active: boolean
    created_at: string
    updated_at: string
    ward_id?: string | null
}

export interface CreateUserInput {
    username: string
    password: string
    role: UserRole
}

export interface UpdateUserInput {
    username?: string
    password?: string
    role?: UserRole
}
