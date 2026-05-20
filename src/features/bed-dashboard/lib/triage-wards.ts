import { query } from '@/shared/lib/db'
import { SETTINGS_CACHE_TAG, withCache } from '@/shared/lib/query-cache'

async function fetchTriageWardIdsFromDB(): Promise<string[]> {
  const result = await query<{ id: string }>(
    `
    SELECT id
    FROM wards
    WHERE is_active = true
      AND (
        UPPER(code) = 'TRIAGE'
        OR LOWER(name) LIKE '%triage%'
      )
    `
  )
  return result.rows.map((row) => row.id)
}

export const getTriageWardIds = withCache(fetchTriageWardIdsFromDB, 'bed-dashboard:get-triage-ward-ids', 120, [SETTINGS_CACHE_TAG])
