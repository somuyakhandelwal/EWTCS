import { query } from '@/shared/lib/db'
import type { WebhookEndpointRow } from '../schemas/webhook-endpoint-schemas'
import type { z } from 'zod'
import type { createWebhookEndpointSchema, updateWebhookEndpointSchema } from '../schemas/webhook-endpoint-schemas'

export async function getWebhookEndpoints(): Promise<WebhookEndpointRow[]> {
  const result = await query<WebhookEndpointRow>(
    `
      SELECT
        id,
        name,
        target_url AS "targetUrl",
        subscribed_events AS "subscribedEvents",
        is_active AS "isActive",
        timeout_ms AS "timeoutMs",
        max_retries AS "maxRetries",
        retry_backoff_base_ms AS "retryBackoffBaseMs",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM webhook_endpoints
      ORDER BY created_at DESC
    `
  )
  return result.rows
}

export async function createWebhookEndpoint(
  data: z.infer<typeof createWebhookEndpointSchema>,
  userId: string
): Promise<string> {
  const result = await query<{ id: string }>(
    `
      INSERT INTO webhook_endpoints (
        name,
        target_url,
        signing_secret,
        subscribed_events,
        timeout_ms,
        max_retries,
        retry_backoff_base_ms,
        created_by_user_id,
        updated_by_user_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)
      RETURNING id
    `,
    [
      data.name,
      data.targetUrl,
      data.signingSecret,
      data.subscribedEvents,
      data.timeoutMs ?? 5000,
      data.maxRetries ?? 3,
      data.retryBackoffBaseMs ?? 500,
      userId,
    ]
  )
  return result.rows[0].id
}

export async function updateWebhookEndpoint(
  data: z.infer<typeof updateWebhookEndpointSchema>,
  userId: string
): Promise<number> {
  const result = await query(
    `
      UPDATE webhook_endpoints
      SET
        name = COALESCE($2, name),
        target_url = COALESCE($3, target_url),
        signing_secret = COALESCE($4, signing_secret),
        subscribed_events = COALESCE($5, subscribed_events),
        timeout_ms = COALESCE($6, timeout_ms),
        max_retries = COALESCE($7, max_retries),
        retry_backoff_base_ms = COALESCE($8, retry_backoff_base_ms),
        is_active = COALESCE($9, is_active),
        updated_by_user_id = $10,
        updated_at = NOW()
      WHERE id = $1
    `,
    [
      data.id,
      data.name ?? null,
      data.targetUrl ?? null,
      data.signingSecret ?? null,
      data.subscribedEvents ?? null,
      data.timeoutMs ?? null,
      data.maxRetries ?? null,
      data.retryBackoffBaseMs ?? null,
      data.isActive ?? null,
      userId,
    ]
  )
  return result.rowCount ?? 0
}

export async function deactivateWebhookEndpoint(id: string, userId: string): Promise<number> {
  const result = await query(
    `
      UPDATE webhook_endpoints
      SET is_active = FALSE, updated_by_user_id = $2, updated_at = NOW()
      WHERE id = $1
    `,
    [id, userId]
  )
  return result.rowCount ?? 0
}
