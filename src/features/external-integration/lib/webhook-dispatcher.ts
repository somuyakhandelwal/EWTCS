import 'server-only'

import { logger } from '@/shared/config/logger'
import type { WebhookEventPayload } from '../types/webhook.types'
import {
  claimDueWebhookDeliveries,
  enqueueWebhookEvent,
  insertWebhookAttemptLog,
  markWebhookDeliveryStatus,
  type WebhookDeliveryJob,
} from './webhook-delivery-queries'
import { createWebhookHeaders } from './webhook-signature'

const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504])
const MAX_RETRY_BACKOFF_MS = 60 * 60 * 1000

function isRetryableStatus(status: number): boolean {
  return RETRYABLE_HTTP_STATUSES.has(status)
}

function computeNextRetryAt(attemptNumber: number, baseMs: number): Date {
  const exponent = Math.max(0, attemptNumber - 1)
  const backoffMs = Math.min(baseMs * 2 ** exponent, MAX_RETRY_BACKOFF_MS)
  return new Date(Date.now() + backoffMs)
}

async function postWebhook(job: WebhookDeliveryJob): Promise<{
  ok: boolean
  status?: number
  responseBody?: string
  requestSignature: string
  durationMs: number
  errorMessage?: string
}> {
  const rawPayload = JSON.stringify(job.payload)
  const timestamp = new Date().toISOString()
  const headers = createWebhookHeaders(job.payload, job.signingSecret, timestamp, rawPayload)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), job.timeoutMs)
  const started = Date.now()

  try {
    const response = await fetch(job.targetUrl, {
      method: 'POST',
      headers,
      body: rawPayload,
      signal: controller.signal,
    })

    const responseBody = await response.text()
    const durationMs = Date.now() - started

    return {
      ok: response.ok,
      status: response.status,
      responseBody: responseBody.slice(0, 2000),
      requestSignature: headers['X-EWTCS-Signature'],
      durationMs,
      errorMessage: response.ok ? undefined : `HTTP ${response.status}`,
    }
  } catch (error) {
    const durationMs = Date.now() - started
    const errorMessage = error instanceof Error ? error.message : 'Webhook request failed'
    return {
      ok: false,
      requestSignature: headers['X-EWTCS-Signature'],
      durationMs,
      errorMessage,
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function processWebhookDeliveryJob(job: WebhookDeliveryJob): Promise<void> {
  const response = await postWebhook(job)
  const maxAttempts = 1 + job.maxRetries
  const shouldRetry =
    !response.ok &&
    job.attempts < maxAttempts &&
    (response.status === undefined || isRetryableStatus(response.status))

  const nextRetryAt = shouldRetry
    ? computeNextRetryAt(job.attempts, job.retryBackoffBaseMs)
    : undefined

  await insertWebhookAttemptLog({
    deliveryId: job.deliveryId,
    endpointId: job.endpointId,
    attemptNumber: job.attempts,
    requestSignature: response.requestSignature,
    responseStatus: response.status,
    responseBody: response.responseBody,
    durationMs: response.durationMs,
    errorMessage: response.errorMessage,
    succeeded: response.ok,
    nextRetryAt,
  })

  if (response.ok) {
    await markWebhookDeliveryStatus({
      deliveryId: job.deliveryId,
      status: 'delivered',
      deliveredAt: new Date(),
      lastError: null,
    })
    return
  }

  if (shouldRetry && nextRetryAt) {
    await markWebhookDeliveryStatus({
      deliveryId: job.deliveryId,
      status: 'failed',
      nextAttemptAt: nextRetryAt,
      lastError: response.errorMessage ?? 'Delivery failed',
    })
    return
  }

  await markWebhookDeliveryStatus({
    deliveryId: job.deliveryId,
    status: 'dead_letter',
    lastError: response.errorMessage ?? 'Delivery failed',
  })
}

export async function queueWebhookEvent(payload: WebhookEventPayload): Promise<number> {
  const queuedCount = await enqueueWebhookEvent(payload)
  logger.info('Webhook event queued', {
    eventId: payload.eventId,
    eventType: payload.eventType,
    queuedCount,
  })
  return queuedCount
}

export async function dispatchDueWebhooks(limit = 25): Promise<{
  claimed: number
  delivered: number
  failed: number
}> {
  const jobs = await claimDueWebhookDeliveries(limit)
  if (jobs.length === 0) {
    return { claimed: 0, delivered: 0, failed: 0 }
  }

  let delivered = 0
  let failed = 0

  for (const job of jobs) {
    try {
      await processWebhookDeliveryJob(job)
      const terminalFailure = job.attempts >= 1 + job.maxRetries
      if (terminalFailure) {
        failed += 1
      } else {
        delivered += 1
      }
    } catch (error) {
      failed += 1
      logger.error('Webhook dispatch processing failed', error as Error, {
        deliveryId: job.deliveryId,
        endpointId: job.endpointId,
        eventType: job.eventType,
      })

      await markWebhookDeliveryStatus({
        deliveryId: job.deliveryId,
        status: 'failed',
        nextAttemptAt: computeNextRetryAt(job.attempts, job.retryBackoffBaseMs),
        lastError: error instanceof Error ? error.message : 'Dispatcher processing failure',
      })
    }
  }

  return {
    claimed: jobs.length,
    delivered,
    failed,
  }
}
