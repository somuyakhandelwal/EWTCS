import 'server-only'
import pool from '@/shared/lib/db'

/**
 * US-5.5: Password-reset DB helpers shared between auth and user-management.
 * Keeps DB access isolated from server actions.
 */

/**
 * Returns must_change_password flag and temp_password_set_at for a user.
 * Used in the login flow to decide whether to redirect to /change-password.
 */
export async function getPasswordResetStatus(userId: string): Promise<{
  mustChangePassword: boolean
  tempPasswordSetAt: Date | null
}> {
  const { rows } = await pool.query<{
    must_change_password: boolean
    temp_password_set_at: Date | null
  }>(
    'SELECT must_change_password, temp_password_set_at FROM users WHERE id = $1',
    [userId]
  )

  if (!rows[0]) return { mustChangePassword: false, tempPasswordSetAt: null }

  return {
    mustChangePassword: rows[0].must_change_password,
    tempPasswordSetAt: rows[0].temp_password_set_at,
  }
}

/**
 * Updates the user's password hash and clears the must_change_password flag.
 * Called after the user successfully sets their own new password.
 */
export async function applyNewPassword(
  userId: string,
  passwordHash: string
): Promise<void> {
  await pool.query(
    `UPDATE users
     SET password_hash         = $1,
         must_change_password  = FALSE,
         temp_password_set_at  = NULL,
         updated_at            = NOW()
     WHERE id = $2`,
    [passwordHash, userId]
  )
}

/**
 * Sets a new hashed password and marks the account as requiring a password
 * change on next login. Called by the admin reset action.
 */
export async function setTempPassword(
  userId: string,
  passwordHash: string
): Promise<void> {
  await pool.query(
    `UPDATE users
     SET password_hash         = $1,
         must_change_password  = TRUE,
         temp_password_set_at  = NOW(),
         updated_at            = NOW()
     WHERE id = $2`,
    [passwordHash, userId]
  )
}
