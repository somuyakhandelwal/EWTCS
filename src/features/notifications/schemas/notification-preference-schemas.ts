// Notification Preference Schemas
// EPIC 15: Notifications & Alerts (US-15.5)

import { z } from 'zod'
import { alertTypeSchema } from '@/features/alerts/schemas/alert-schemas'

/** One preference row to save */
export const notificationPreferenceItemSchema = z.object({
  alertType: alertTypeSchema,
  enabled: z.boolean(),
  /** null → use system default; integer → custom threshold in minutes */
  minDelayThresholdMinutes: z
    .number()
    .int('Must be a whole number of minutes')
    .min(1, 'Minimum threshold is 1 minute')
    .max(1440, 'Maximum threshold is 24 hours (1440 minutes)')
    .nullable(),
})

/** Full update payload — an array of preferences to UPSERT for the current user */
export const updateNotificationPreferencesSchema = z.object({
  preferences: z
    .array(notificationPreferenceItemSchema)
    .min(1, 'At least one preference is required'),
})

export type NotificationPreferenceItem = z.infer<typeof notificationPreferenceItemSchema>
export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>
