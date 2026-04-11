import { describe, expect, it } from 'vitest'
import { createWebhookHeaders, createWebhookSignature } from '../webhook-signature'

describe('webhook-signature', () => {
  it('creates deterministic HMAC signature for identical inputs', () => {
    const secret = 'test-signing-secret'
    const timestamp = '2026-04-11T00:00:00.000Z'
    const payload = '{"a":1}'

    const sig1 = createWebhookSignature(secret, timestamp, payload)
    const sig2 = createWebhookSignature(secret, timestamp, payload)

    expect(sig1).toBe(sig2)
    expect(sig1.startsWith('sha256=')).toBe(true)
  })

  it('builds required delivery headers', () => {
    const payload = {
      eventId: '27d82464-834a-4be7-8946-4f6a516eb3b4',
      eventType: 'bed.status.changed' as const,
      occurredAt: '2026-04-11T00:00:00.000Z',
      source: 'ewtcs' as const,
      version: '1.0' as const,
      bedId: '95c8f786-aa46-4436-80d1-b348fdc412fa',
      bedNumber: 'ER-01',
      fromStageId: null,
      toStageId: 'df35ad7f-b53f-4ab0-8758-ddd89d94e5af',
    }

    const rawPayload = JSON.stringify(payload)
    const headers = createWebhookHeaders(
      payload,
      'test-signing-secret',
      '2026-04-11T00:00:00.000Z',
      rawPayload
    )

    expect(headers['Content-Type']).toBe('application/json')
    expect(headers['X-EWTCS-Event']).toBe('bed.status.changed')
    expect(headers['X-EWTCS-Event-Id']).toBe(payload.eventId)
    expect(headers['X-EWTCS-Signature'].startsWith('sha256=')).toBe(true)
  })
})
