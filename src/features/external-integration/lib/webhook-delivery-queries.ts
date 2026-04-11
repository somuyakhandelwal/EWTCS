import 'server-only'

import { query } from '@/shared/lib/db'
import type { WebhookDeliveryStatus, WebhookEventPayload, WebhookEventType } from '../types/webhook.types'

export interface WebhookDeliveryJob {
  deliveryId: string
  endpointId: string
  eventId: string
  eventType: WebhookEventType
  payload: WebhookEventPayload
  attempts: number
  targetUrl: string
  signingSecret: string
  timeoutMs: number
  maxRetries: number
  retryBackoffBaseMs: number
}

export interface WebhookAttemptLogInput {
  deliveryId: string
  endpointId: string
  attemptNumber: number
  requestSignature: string
  responseStatus?: number
  responseBody?: string
  durationMs?: number
  errorMessage?: string
  succeeded: boolean
  nextRetryAt?: Date
}

export async function enqueueWebhookEvent(payload: WebhookEventPayload): Promise<number> {
  const result = await query<{ endpoint_id: string }>(
    `
      INSERT INTO webhook_deliveries (endpoint_id, event_id, event_type, payload, status, next_attempt_at)
      SELECT
        we.id,
        $1::uuid,
        $2,
        $3::jsonb,
        'pending',
        NOW()
      FROM webhook_endpoints we
      WHERE we.is_active = TRUE
        AND $2 = ANY(we.subscribed_events)
      ON CONFLICT (event_id, endpoint_id) DO NOTHING
      RETURNING endpoint_id
    `,
    [payload.eventId, payload.eventType, JSON.stringify(payload)]
  )

  return result.rowCount ?? 0
}

export async function claimDueWebhookDeliveries(limit: number): Promise<WebhookDeliveryJob[]> {
  const result = await query<WebhookDeliveryJob>(
    `
      UPDATE webhook_deliveries AS d
      SET
        status = 'processing',
        attempts = d.attempts + 1,
        last_attempt_at = NOW(),
        updated_at = NOW()
      FROM (
        SELECT d0.id
        FROM webhook_deliveries d0
        JOIN webhook_endpoints we0 ON we0.id = d0.endpoint_id
        WHERE d0.status IN ('pending', 'failed')
          AND d0.next_attempt_at <= NOW()
          AND we0.is_active = TRUE
        ORDER BY d0.next_attempt_at ASC, d0.created_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      ) AS due
      JOIN webhook_endpoints we ON we.id = d.endpoint_id
      WHERE d.id = due.id
      RETURNING
        d.id AS "deliveryId",
        d.endpoint_id AS "endpointId",
        d.event_id AS "eventId",
        d.event_type AS "eventType",
        d.payload,
        d.attempts,
        we.target_url AS "targetUrl",
        we.signing_secret AS "signingSecret",
        we.timeout_ms AS "timeoutMs",
        we.max_retries AS "maxRetries",
        we.retry_backoff_base_ms AS "retryBackoffBaseMs"
    `,
    [limit]
  )

  return result.rows
}

export async function insertWebhookAttemptLog(input: WebhookAttemptLogInput): Promise<void> {
  await query(
    `
      INSERT INTO webhook_delivery_attempts (
        delivery_id,
        endpoint_id,
        attempt_number,
        request_signature,
        response_status,
        response_body,
        duration_ms,
        error_message,
        succeeded,
        next_retry_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `,
    [
      input.deliveryId,
      input.endpointId,
      input.attemptNumber,
      input.requestSignature,
      input.responseStatus ?? null,
      input.responseBody ?? null,
      input.durationMs ?? null,
      input.errorMessage ?? null,
      input.succeeded,
      input.nextRetryAt ?? null,
    ]
  )
}

export async function markWebhookDeliveryStatus(args: {
  deliveryId: string
  status: WebhookDeliveryStatus
  nextAttemptAt?: Date
  deliveredAt?: Date
  lastError?: string
}): Promise<void> {
  await query(
    `
      UPDATE webhook_deliveries
      SET
        status = $2,
        next_attempt_at = COALESCE($3, next_attempt_at),
        delivered_at = COALESCE($4, delivered_at),
        last_error = $5,
        updated_at = NOW()
      WHERE id = $1
    `,
    [
      args.deliveryId,
      args.status,
      args.nextAttemptAt ?? null,
      args.deliveredAt ?? null,
      args.lastError ?? null,
    ]
  )
}
