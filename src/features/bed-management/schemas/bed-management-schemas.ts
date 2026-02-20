import { z } from 'zod'

// Schema for creating a new bed
export const createBedSchema = z.object({
    bedNumber: z
        .string()
        .min(2, 'Bed number must be at least 2 characters')
        .max(50, 'Bed number must not exceed 50 characters')
        .regex(/^[A-Z0-9-]+$/i, 'Bed number can only contain letters, numbers, and hyphens')
        .trim(),
    wardId: z
        .string()
        .uuid('Invalid ward ID'),
    location: z
        .string()
        .max(255, 'Location must not exceed 255 characters')
        .trim()
        .optional(),
})

// Schema for updating an existing bed
export const updateBedSchema = z.object({
    bedId: z
        .string()
        .uuid('Invalid bed ID'),
    bedNumber: z
        .string()
        .min(2, 'Bed number must be at least 2 characters')
        .max(50, 'Bed number must not exceed 50 characters')
        .regex(/^[A-Z0-9-]+$/i, 'Bed number can only contain letters, numbers, and hyphens')
        .trim()
        .optional(),
    wardId: z
        .string()
        .uuid('Invalid ward ID')
        .optional(),
    location: z
        .string()
        .max(255, 'Location must not exceed 255 characters')
        .trim()
        .optional(),
})

// Schema for deactivating/reactivating a bed
export const toggleBedStatusSchema = z.object({
    bedId: z
        .string()
        .uuid('Invalid bed ID'),
})

// US-6.5: Schema for creating a temporary (surge) bed
export const createTemporaryBedSchema = z.object({
    bedNumber: z
        .string()
        .min(2, 'Bed number must be at least 2 characters')
        .max(50, 'Bed number must not exceed 50 characters')
        .regex(/^[A-Z0-9-]+$/i, 'Bed number can only contain letters, numbers, and hyphens')
        .trim(),
    location: z
        .string()
        .max(255, 'Location must not exceed 255 characters')
        .trim()
        .optional(),
})

// US-6.6: Schema for creating a virtual (hallway/stretcher) bed
// Label is a free-text descriptive name — no alphanumeric-only restriction.
export const createVirtualBedSchema = z.object({
    label: z
        .string()
        .min(2, 'Label must be at least 2 characters')
        .max(100, 'Label must not exceed 100 characters')
        .regex(/^[A-Z0-9 ._()-]+$/i, 'Label can only contain letters, numbers, spaces, and . _ ( ) -')
        .trim(),
    location: z
        .string()
        .max(255, 'Location must not exceed 255 characters')
        .trim()
        .optional(),
})

export type CreateBedInput = z.infer<typeof createBedSchema>
export type UpdateBedInput = z.infer<typeof updateBedSchema>
export type ToggleBedStatusInput = z.infer<typeof toggleBedStatusSchema>
export type CreateTemporaryBedInput = z.infer<typeof createTemporaryBedSchema>
export type CreateVirtualBedInput = z.infer<typeof createVirtualBedSchema>
