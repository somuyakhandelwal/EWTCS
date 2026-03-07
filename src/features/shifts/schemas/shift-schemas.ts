// Shift Schemas
// EPIC 8: Shift Management (US-8.1)

import { z } from 'zod'

/** HH:MM or HH:MM:SS 24-hour time string */
const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time must be in HH:MM or HH:MM:SS format')

export const createShiftSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
  startTime: timeSchema,
  endTime: timeSchema,
})

export const updateShiftSchema = createShiftSchema.extend({
  id: z.string().uuid('Invalid shift ID'),
  isActive: z.boolean().optional(),
})

export const deleteShiftSchema = z.object({
  id: z.string().uuid('Invalid shift ID'),
})

export type CreateShiftInput = z.infer<typeof createShiftSchema>
export type UpdateShiftInput = z.infer<typeof updateShiftSchema>
export type DeleteShiftInput = z.infer<typeof deleteShiftSchema>
