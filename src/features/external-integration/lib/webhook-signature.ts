import crypto from 'crypto'
import type { WebhookDeliveryHeaders, WebhookEventPayload } from '../types/webhook.types'

/**
 * HMAC format: sha256=<hex digest of `${timestamp}\n${rawPayload}`>
 */
export function createWebhookSignature(
  signingSecret: string,
  timestamp: string,
  rawPayload: string
): string {
  const canonical = `${timestamp}\n${rawPayload}`
  const digest = crypto.createHmac('sha256', signingSecret).update(canonical).digest('hex')
  return `sha256=${digest}`
}

export function createWebhookHeaders(
  payload: WebhookEventPayload,
  signingSecret: string,
  timestamp: string,
  rawPayload: string
): WebhookDeliveryHeaders {
  return {
    'Content-Type': 'application/json',
    'X-EWTCS-Event': payload.eventType,
    'X-EWTCS-Timestamp': timestamp,
    'X-EWTCS-Signature': createWebhookSignature(signingSecret, timestamp, rawPayload),
    'X-EWTCS-Event-Id': payload.eventId,
  }
}
