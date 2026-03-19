import { query } from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'

/** Get the ward ID and flags for a specific bed (for access control) */
export async function getBedAccessInfo(
  bedId: string
): Promise<{ ward_id: string | null; is_virtual: boolean; is_temporary: boolean } | null> {
  try {
    const result = await query<{ ward_id: string | null; is_virtual: boolean; is_temporary: boolean }>(
      `
      SELECT b.ward_id, b.is_virtual, b.is_temporary
      FROM beds b
      WHERE b.id = $1
      LIMIT 1
      `,
      [bedId]
    )
    return result.rows[0] || null
  } catch (error) {
    logger.error('Failed to fetch bed access info', error as Error, { bedId })
    throw new Error('Failed to verify bed access')
  }
}

/** Get the ward ID for a specific bed (compatibility wrapper) */
export async function getBedWard(bedId: string): Promise<string | null> {
  const info = await getBedAccessInfo(bedId)
  return info?.ward_id || null
}

/** Get the ward ID for a specific user (for access control) */
export async function getUserWard(userId: string): Promise<string | null> {
  try {
    const result = await query<{ ward_id: string | null }>(
      `
      SELECT u.ward_id
      FROM users u
      WHERE u.id = $1
      LIMIT 1
      `,
      [userId]
    )

    return result.rows[0]?.ward_id || null
  } catch (error) {
    logger.error('Failed to fetch user ward', error as Error, { userId })
    throw new Error('Failed to verify access permissions')
  }
}

/**
 * Verify ward-level access for a user/bed pair.
 * Returns null when access is granted, or an error string to return to the client.
 */
export async function checkWardAccess(
  userId: string,
  bedId: string,
  role: string
): Promise<string | null> {
  const [userWard, bedInfo] = await Promise.all([getUserWard(userId), getBedAccessInfo(bedId)])

  if (!bedInfo) return 'Bed not found.'

  if (role === 'admin') return null

  if (bedInfo.is_virtual || bedInfo.is_temporary) return null

  if (!userWard) return null

  if (userWard && !bedInfo.ward_id) {
    return 'This bed does not belong to any ward. Contact your administrator.'
  }

  const allowed = userWard === bedInfo.ward_id
  return allowed
    ? null
    : 'You do not have permission to update this bed. Access is restricted to your assigned ward.'
}
