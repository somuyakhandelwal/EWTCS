// Alert Mutations
// EPIC 15: Notifications & Alerts (US-15.4)
// Purpose: Write acknowledgment records to the database.

import 'server-only'

import { query } from '@/shared/lib/db'
import type { AcknowledgeAlertInput } from '../schemas/alert-schemas'

/**
 * Upsert an acknowledgment for an alert.
 * If the supervisor re-acknowledges an already-acknowledged alert the existing
 * row is updated in-place (new expiry, new notes, new actor).
 */
export async function upsertAcknowledgment(
  input: AcknowledgeAlertInput,
  userId: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + input.expiryHours * 60 * 60 * 1000)

  await query(
    `INSERT INTO alert_acknowledgments
       (alert_type, alert_key, bed_id, acknowledged_by_user_id, expires_at, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (alert_key) DO UPDATE SET
       acknowledged_by_user_id = EXCLUDED.acknowledged_by_user_id,
       acknowledged_at         = NOW(),
       expires_at              = EXCLUDED.expires_at,
       notes                   = EXCLUDED.notes`,
    [input.alertType, input.alertKey, input.bedId, userId, expiresAt, input.notes ?? null]
  )
}
