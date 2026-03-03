import { z } from 'zod'

export const alertTypePreferencesSchema = z.object({
  delayedBeds: z.boolean(),
  escalations: z.boolean(),
  dispositionBottlenecks: z.boolean(),
  systemErrors: z.boolean(),
})

export const alertThresholdPreferencesSchema = z
  .object({
    delayMinutes: z.coerce.number().int().min(30).max(12 * 60),
    escalationMinutes: z.coerce.number().int().min(60).max(24 * 60),
    bottleneckCount: z.coerce.number().int().min(1).max(50),
  })
  .refine((value) => value.escalationMinutes > value.delayMinutes, {
    message: 'Escalation threshold must be greater than delay threshold',
    path: ['escalationMinutes'],
  })

export const alertPreferencesSchema = z.object({
  enabledAlertTypes: alertTypePreferencesSchema,
  thresholds: alertThresholdPreferencesSchema,
})

export type AlertPreferencesInput = z.infer<typeof alertPreferencesSchema>
