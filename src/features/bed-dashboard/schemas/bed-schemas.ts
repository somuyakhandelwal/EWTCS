// Bed Dashboard Validation Schemas
// Epic 1: Nurse Desk Bed Dashboard

import { z } from 'zod'

export const StageSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  displayOrder: z.number().int().min(0),
  colorCode: z.string().min(1).max(20),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const BedSchema = z.object({
  id: z.string().uuid(),
  bedNumber: z.string().min(1).max(50),
  currentStageId: z.string().uuid().nullable(),
  patientStartTime: z.date().nullable(),
  lastStageChange: z.date().nullable(),
  isOccupied: z.boolean(),
  isActive: z.boolean(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const CreateBedSchema = z.object({
  bedNumber: z
    .string()
    .min(1, 'Bed number is required')
    .max(50, 'Bed number too long')
    .regex(/^[A-Z0-9-]+$/, 'Bed number must contain only uppercase letters, numbers, and hyphens'),
})

export const UpdateBedStageSchema = z.object({
  bedId: z.string().uuid('Invalid bed ID'),
  toStageId: z.string().uuid('Invalid stage ID'),
  notes: z.string().max(500).optional(),
})

export type CreateBedInput = z.infer<typeof CreateBedSchema>
export type UpdateBedStageInput = z.infer<typeof UpdateBedStageSchema>
