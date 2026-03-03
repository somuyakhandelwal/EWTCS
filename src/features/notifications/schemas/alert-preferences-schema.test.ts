import { describe, expect, it } from 'vitest'
import { alertPreferencesSchema } from './alert-preferences-schema'

describe('alertPreferencesSchema', () => {
  it('accepts valid preference payload', () => {
    const result = alertPreferencesSchema.safeParse({
      enabledAlertTypes: {
        delayedBeds: true,
        escalations: true,
        dispositionBottlenecks: false,
        systemErrors: true,
      },
      thresholds: {
        delayMinutes: 180,
        escalationMinutes: 240,
        bottleneckCount: 3,
      },
    })

    expect(result.success).toBe(true)
  })

  it('rejects escalation threshold lower than delay threshold', () => {
    const result = alertPreferencesSchema.safeParse({
      enabledAlertTypes: {
        delayedBeds: true,
        escalations: true,
        dispositionBottlenecks: true,
        systemErrors: true,
      },
      thresholds: {
        delayMinutes: 180,
        escalationMinutes: 120,
        bottleneckCount: 3,
      },
    })

    expect(result.success).toBe(false)
  })
})
