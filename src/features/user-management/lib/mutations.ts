import bcrypt from 'bcrypt'
import pool from '@/shared/lib/db'

/**
 * Create user in database
 * Epic 5: US-5.3 - User Management
 */
export async function createUserInDB(
    username: string,
    password: string,
    role: string
) {
    // Check if username already exists
    const existing = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
    )

    if (existing.rows.length > 0) {
        throw new Error('Username already exists')
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
    role?: string
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
 */
export async function deactivateUserInDB(userId: string) {
    await pool.query(
        'UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1',
        [userId]
    )
}

/**
 * Activate user in database
 * Epic 5: US-5.3 - User Management
 */
export async function activateUserInDB(userId: string) {
    await pool.query(
        'UPDATE users SET is_active = TRUE, updated_at = NOW() WHERE id = $1',
        [userId]
    )
}
