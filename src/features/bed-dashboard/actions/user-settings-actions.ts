'use server'
// DB5-02: Server actions for user preference persistence
// Security: userId is always read from the verified session — never trusted from the client.

import { verifySession } from '@/shared/lib/session'
import {
  selectUserPreferences,
  upsertUserPreferences,
} from '@/features/bed-dashboard/lib/user-settings-queries'
import type { UserPreferences } from '@/shared/types/user-preferences.types'
import { DEFAULT_USER_PREFERENCES } from '@/shared/types/user-preferences.types'

/**
 * Fetch the current user's stored preferences.
 * Returns DEFAULT_USER_PREFERENCES if unauthenticated or on DB error.
 * Safe to call from the root layout (GlobalHelp) where a session may not exist.
 */
export async function getUserSettings(): Promise<UserPreferences> {
  const session = await verifySession()
  if (!session?.userId) {
    return { ...DEFAULT_USER_PREFERENCES }
  }
  return selectUserPreferences(session.userId)
}

/**
 * Persist a partial preference patch for the current user.
 * Silently no-ops if unauthenticated.
 * Client-side callers should debounce before calling this action.
 */
export async function updateUserSettings(
  patch: Partial<UserPreferences>
): Promise<void> {
  const session = await verifySession()
  if (!session?.userId) return

  await upsertUserPreferences(session.userId, patch)
}
