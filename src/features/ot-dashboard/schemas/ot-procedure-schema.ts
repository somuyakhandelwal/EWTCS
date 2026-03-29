import { z } from 'zod'

export const OTProcedureStartSchema = z.object({
  roomId: z.string().uuid('Invalid OT room id'),
  procedureName: z
    .string()
    .trim()
    .min(2, 'Procedure name is required')
    .max(100, 'Procedure name must be 100 characters or less'),
})

export const OTProcedureFinishSchema = z.object({
  roomId: z.string().uuid('Invalid OT room id'),
})

export type OTProcedureStartInput = z.infer<typeof OTProcedureStartSchema>
export type OTProcedureFinishInput = z.infer<typeof OTProcedureFinishSchema>
