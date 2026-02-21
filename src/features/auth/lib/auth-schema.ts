// Auth Schema & Constants
// Purpose: Validation schema and shared constants for auth-actions.ts

import { z } from 'zod'

export const UNKNOWN_ACTOR_ID = '00000000-0000-0000-0000-000000000000'

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})
