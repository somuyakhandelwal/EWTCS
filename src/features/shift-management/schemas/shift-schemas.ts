// Shift Management Validation Schemas (US-8.1)
// Epic 8: Shift Management

import { z } from 'zod'

/** Accepts "HH:MM" or "HH:MM:SS" from both forms and PostgreSQL TIME columns */
const TimeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time must be in HH:MM format')

export const CreateShiftSchema = z.object({
  name: z
    .string()
    .min(1, 'Shift name is required')
    .max(100, 'Shift name must be max 100 characters'),
  start_time: TimeSchema,
  end_time: TimeSchema,
})

export const UpdateShiftSchema = z.object({
  id: z.string().uuid('Invalid shift ID'),
  name: z.string().min(1).max(100).optional(),
  start_time: TimeSchema.optional(),
  end_time: TimeSchema.optional(),
  is_active: z.boolean().optional(),
})

export type CreateShiftSchemaInput = z.infer<typeof CreateShiftSchema>
export type UpdateShiftSchemaInput = z.infer<typeof UpdateShiftSchema>
