// Alert Schemas
// EPIC 15: Notifications & Alerts (US-15.4)

import { z } from 'zod'
import { piiRefine } from '@/shared/lib/pii'

export const alertTypeSchema = z.enum([
  'delayed_bed',
  'disposition_bottleneck',
  'system_error',
])

/** Valid acknowledgment durations offered to the supervisor */
export const EXPIRY_HOURS_OPTIONS = [1, 2, 4, 8] as const
export type ExpiryHours = (typeof EXPIRY_HOURS_OPTIONS)[number]

export const acknowledgeAlertSchema = z.object({
  alertKey: z
    .string()
    .min(1, 'Alert key is required')
    .max(200, 'Alert key too long'),
  alertType: alertTypeSchema,
  bedId: z.string().uuid('Invalid bed ID').nullable(),
  expiryHours: z
    .number()
    .int()
    .refine(
      (v): v is ExpiryHours => (EXPIRY_HOURS_OPTIONS as readonly number[]).includes(v),
      { message: 'Expiry must be 1, 2, 4, or 8 hours' }
    )
    .default(2),
  // US-17.6/17.8: PII blocked from notes field
  notes: z.string().max(500).optional().superRefine((val, ctx) => {
    if (val) piiRefine(val, ctx)
  }),
})

export type AcknowledgeAlertInput = z.infer<typeof acknowledgeAlertSchema>
