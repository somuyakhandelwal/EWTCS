import bcrypt from 'bcrypt'
import pool from '@/shared/lib/db'
import { exists, softDelete, reactivate } from '@/shared/lib/db-helpers'

/**
 * Create user in database
 * Epic 5: US-5.3 - User Management
 */
export async function createUserInDB(
    username: string,
    password: string,
    role: string,
    wardId?: string | null
) {
    // Check if username already exists using shared helper
    const userExists = await exists('users', 'username = $1', [username])

    if (userExists) {
        throw new Error('Username already exists')
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Insert user
    const insertResult = await pool.query(
        `INSERT INTO users (username, password_hash, role, is_active, ward_id)
        VALUES ($1, $2, $3, TRUE, $4)
        RETURNING id, username, role`,
        [username, passwordHash, role, wardId ?? null]
    )

    return insertResult.rows[0]
}

/**
 * Update user in database
 * Epic 5: US-5.3 - User Management
 */
export async function updateUserInDB(
    userId: string,
    username?: string,
    password?: string,
    role?: string,
    wardId?: string | null
) {
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

    if (wardId !== undefined) {
        updates.push(`ward_id = $${paramIndex++}`)
        values.push(wardId)
        changes.wardId = wardId
    }

    if (updates.length === 0) {
        throw new Error('No fields to update')
    }

    updates.push(`updated_at = NOW()`)
    values.push(userId)

    await pool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        values
    )

    return changes
}

/**
 * Deactivate user in database
 * Epic 5: US-5.3 - User Management
 * 
 * Now uses shared softDelete helper for consistency across all entities
 */
export async function deactivateUserInDB(userId: string) {
    await softDelete('users', userId)
}

/**
 * Activate user in database
 * Epic 5: US-5.3 - User Management
 * 
 * Now uses shared reactivate helper for consistency across all entities
 */
export async function activateUserInDB(userId: string) {
    await reactivate('users', userId)
}

