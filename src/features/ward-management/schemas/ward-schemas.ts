import { z } from 'zod'

export const createWardSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    code: z.string().min(2, "Code must be at least 2 characters").max(20),
    description: z.string().optional()
})
