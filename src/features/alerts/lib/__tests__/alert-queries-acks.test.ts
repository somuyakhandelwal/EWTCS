// Alert Queries Tests — Acknowledgments
// EPIC 15: Notifications & Alerts (US-15.4)

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/lib/db', () => ({ query: vi.fn() }))

import { query } from '@/shared/lib/db'
import { getActiveAcknowledgments } from '../alert-queries'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getActiveAcknowledgments', () => {
  it('returns mapped acknowledgment records', async () => {
    const expiry = new Date('2026-03-07T18:00:00Z')
    vi.mocked(query).mockResolvedValue({
      rows: [{
        id: 'ack-1',
        alertType: 'delayed_bed',
        alertKey: 'delayed_bed:bed-1',
        bedId: 'bed-1',
        acknowledgedByUserId: 'sup-1',
        acknowledgedByUsername: 'supervisor1',
        acknowledgedAt: new Date('2026-03-07T12:00:00Z'),
        expiresAt: expiry,
        notes: 'Handled',
      }],
    } as never)

    const acks = await getActiveAcknowledgments()

    expect(acks).toHaveLength(1)
    expect(acks[0].alertKey).toBe('delayed_bed:bed-1')
    expect(acks[0].acknowledgedByUsername).toBe('supervisor1')
  })
})
