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

export type CreateBedInput = z.infer<typeof createBedSchema>
export type UpdateBedInput = z.infer<typeof updateBedSchema>
export type ToggleBedStatusInput = z.infer<typeof toggleBedStatusSchema>
