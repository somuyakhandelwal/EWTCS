'use server'

import { query } from '@/shared/lib/db'
import { getCurrentSession } from '@/shared/lib/auth'

const CURRENT_USER = '__current__'

function getStageDraftKey(userId: string, stageId: string): string {
  return `stage_draft:${userId}:${stageId}`
}

async function resolveUserId(userId: string): Promise<string> {
  const session = await getCurrentSession()
  if (!session) {
    throw new Error('Unauthorized: Authentication required')
  }

  if (!userId || userId === CURRENT_USER || userId === session.userId) {
    return session.userId
  }

  throw new Error('Unauthorized: user mismatch')
}

export async function saveStageDraft(userId: string, stageId: string, draftData: unknown): Promise<void> {
  const effectiveUserId = await resolveUserId(userId)
  const key = getStageDraftKey(effectiveUserId, stageId)
  const value = JSON.stringify(draftData ?? {})

  await query(
    `INSERT INTO system_settings (key, value, description, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, value, 'Stage form draft state']
  )
}

export async function loadStageDraft(userId: string, stageId: string): Promise<unknown | null> {
  const effectiveUserId = await resolveUserId(userId)
  const key = getStageDraftKey(effectiveUserId, stageId)

  const result = await query<{ value: string }>(
    'SELECT value FROM system_settings WHERE key = $1 LIMIT 1',
    [key]
  )

  if (result.rowCount === 0) {
    return null
  }

  try {
    return JSON.parse(result.rows[0].value)
  } catch {
    return null
  }
}

export async function clearStageDraft(userId: string, stageId: string): Promise<void> {
  const effectiveUserId = await resolveUserId(userId)
  const key = getStageDraftKey(effectiveUserId, stageId)

  await query('DELETE FROM system_settings WHERE key = $1', [key])
}