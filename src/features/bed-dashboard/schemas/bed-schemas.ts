// Bed Dashboard Validation Schemas
// Epic 1: Nurse Desk Bed Dashboard

import { z } from 'zod'

/**
 * Base Stage Schema
 * Represents a single workflow stage in the system.
 */
export const StageSchema = z.object({
  /** Unique UUID for the stage */
  id: z.string().uuid(),
  /** Display name shown in UI */
  name: z.string().min(1).max(100),
  /** Integer used for sorting columns in board view */
  displayOrder: z.number().int().min(0),
  /** CSS class or hex code reference for stage styling */
  colorCode: z.string().min(1).max(20),
  /** Optional extended description for tooltips */
  description: z.string().nullable(),
  /** Whether the stage is currently in use */
  isActive: z.boolean(),
  /** Timestamp of creation */
  createdAt: z.date(),
  /** Timestamp of last update */
  updatedAt: z.date(),
})

/**
 * Base Bed Schema
 * Represents a physical bed resource.
 */
export const BedSchema = z.object({
  id: z.string().uuid(),
  bedNumber: z.string().min(1).max(50),
  currentStageId: z.string().uuid().nullable(),
  /** When the CURRENT patient was admitted to this bed (persists across stages) */
  patientStartTime: z.date().nullable(),
  /** When the bed entered the CURRENT stage */
  lastStageChange: z.date().nullable(),
  /** Whether a patient is physically present */
  isOccupied: z.boolean(),
  isActive: z.boolean(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.date(),
  updatedAt: z.date(),
})

/**
 * Input Schema for Creating a New Bed
 */
export const CreateBedSchema = z.object({
  bedNumber: z
    .string()
    .min(1, 'Bed number is required')
    .max(50, 'Bed number too long')
    .regex(/^[A-Z0-9-]+$/, 'Bed number must contain only uppercase letters, numbers, and hyphens'),
})

/**
 * Input Schema for Updating Bed Stage
 * Handles both normal transitions and supervisor overrides.
 */
export const UpdateBedStageSchema = z.object({
  bedId: z.string().uuid('Invalid bed ID'),
  toStageId: z.string().uuid('Invalid stage ID'),
  /** Flag to indicate if this is a forced transition bypassing rules */
  supervisorOverride: z.boolean().optional().default(false),
  /** Required if supervisorOverride is true */
  overrideReason: z.string().max(500).optional(),
  /** Optional clinical notes for the transition */
  notes: z.string().max(500).optional(),
})

/**
 * Input Schema for Correcting Historical Logs
 * Used by supervisors to fix erroneous record entries.
 */
export const CorrectBedStageLogSchema = z.object({
  logId: z.string().uuid('Invalid log ID'),
  /** Mandatory audit reason for the correction */
  reason: z.string().min(5, 'Specific reason is required for audit trail').max(500),
  /** Corrected duration in minutes (string input from UI) */
  newDuration: z.string().optional(),
  /** Corrected notes */
  newNotes: z.string().max(500).optional(),
})

/**
 * Schema for Bed History Log Entry
 * Represents an immutable record of a past stage transition.
 */
export const BedHistoryLogSchema = z.object({
  id: z.string().uuid(),
  bedId: z.string().uuid(),
  fromStageId: z.string().uuid().nullable(),
  toStageId: z.string().uuid(),
  changedByUserId: z.string().uuid(),
  transitionTime: z.date(),
  durationInPreviousStageMs: z.number().nullable(),
  notes: z.string().nullable(),
  correctionHistory: z.array(z.object({
    correctedAt: z.date(),
    correctedBy: z.string(),
    reason: z.string()
  })).optional()
})

/**
 * Schema for Disposition Delay
 * Validates the recording of a delay reason.
 * 
 * Enforcing specific enum values ensures reporting consistency.
 */
export const RecordDispositionDelaySchema = z.object({
  bedId: z.string().uuid(),
  reason: z.enum([
    'transport_delay',
    'cleaning_delay',
    'admin_delay',
    'physician_delay',
    'other'
  ])
})

/**
 * API Response Schema: Bed Grid
 * Validates the structure of the payload returned by the main dashboard endpoint.
 */
export const BedGridResponseSchema = z.object({
  beds: z.array(BedSchema),
  stages: z.array(StageSchema),
  bottleneckCount: z.number(),
  metadata: z.object({
    generatedAt: z.date(),
    version: z.string()
  })
})

/**
 * API Response Schema: Bed History
 */
export const BedHistoryResponseSchema = z.array(BedHistoryLogSchema)

/**
 * Filter Params Schema
 * For dashboard filtering options.
 */
export const BedGridFilterSchema = z.object({
  showDelayedOnly: z.boolean().optional(),
  wardId: z.string().optional(),
  specialty: z.string().optional()
})

export type CreateBedInput = z.infer<typeof CreateBedSchema>
export type UpdateBedStageInput = z.infer<typeof UpdateBedStageSchema>
export type CorrectBedStageLogInput = z.infer<typeof CorrectBedStageLogSchema>
export type BedHistoryLog = z.infer<typeof BedHistoryLogSchema>
export type RecordDispositionDelayInput = z.infer<typeof RecordDispositionDelaySchema>
export type BedGridResponse = z.infer<typeof BedGridResponseSchema>
export type BedGridFilter = z.infer<typeof BedGridFilterSchema>
