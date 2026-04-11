import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'url'
import * as path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function readFile(relativePath: string): Promise<string> {
  const fs = await import('fs')
  return fs.readFileSync(path.resolve(__dirname, relativePath), 'utf-8')
}

describe('US-19.2 webhook implementation smoke checks', () => {
  it('dispatcher includes retry and dead-letter status handling', async () => {
    const src = await readFile('../webhook-dispatcher.ts')

    expect(src).toContain("status: 'dead_letter'")
    expect(src).toContain("status: 'failed'")
    expect(src).toContain('computeNextRetryAt')
    expect(src).toContain('X-EWTCS-Signature')
  })

  it('delivery queries enforce event+endpoint uniqueness and attempt logs', async () => {
    const src = await readFile('../webhook-delivery-queries.ts')

    expect(src).toContain('ON CONFLICT (event_id, endpoint_id) DO NOTHING')
    expect(src).toContain('insertWebhookAttemptLog')
    expect(src).toContain('claimDueWebhookDeliveries')
  })

  it('delay threshold emitter queues bed.delay.threshold.exceeded events', async () => {
    const src = await readFile('../delay-threshold-events.ts')

    expect(src).toContain("eventType: 'bed.delay.threshold.exceeded'")
    expect(src).toContain('enteredDelayedState')
    expect(src).toContain('webhook_delay_event_state')
  })
})
