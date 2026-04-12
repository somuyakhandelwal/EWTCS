// issue-117: Webhook contract types for outbound real-time events.

export const WEBHOOK_EVENT_TYPES = [
  'bed.status.changed',
  'bed.delay.threshold.exceeded',
] as const

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number]

export const WEBHOOK_DELIVERY_STATUSES = [
  'pending',
  'processing',
  'delivered',
  'failed',
  'dead_letter',
] as const

export type WebhookDeliveryStatus = (typeof WEBHOOK_DELIVERY_STATUSES)[number]

export interface WebhookEventBase {
  eventId: string
  eventType: WebhookEventType
  occurredAt: string
  source: 'ewtcs'
  version: '1.0'
}

export interface BedStatusChangedPayload extends WebhookEventBase {
  eventType: 'bed.status.changed'
  bedId: string
  bedNumber: string
  fromStageId: string | null
  toStageId: string
  changedByUserId?: string
}

export interface BedDelayThresholdExceededPayload extends WebhookEventBase {
  eventType: 'bed.delay.threshold.exceeded'
  bedId: string
  bedNumber: string
  currentStageId: string | null
  elapsedTimeMs: number
  thresholdMs: number
}

export type WebhookEventPayload =
  | BedStatusChangedPayload
  | BedDelayThresholdExceededPayload

export interface WebhookEndpointConfig {
  id: string
  name: string
  targetUrl: string
  signingSecret: string
  subscribedEvents: WebhookEventType[]
  isActive: boolean
  timeoutMs: number
  maxRetries: number
  retryBackoffBaseMs: number
}

export interface WebhookDeliveryHeaders {
  [headerName: string]: string
  'Content-Type': 'application/json'
  'X-EWTCS-Event': WebhookEventType
  'X-EWTCS-Timestamp': string
  'X-EWTCS-Signature': string
  'X-EWTCS-Event-Id': string
}
