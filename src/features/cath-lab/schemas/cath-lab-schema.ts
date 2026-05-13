import { z } from 'zod'

export const CathLabProcedureSchema = z
  .object({
    procedureType: z.string().min(1, 'Procedure type is required').max(100),
    patientUhid: z.string().trim().max(100, 'Patient UHID is too long').optional().nullable(),
    cardiologistId: z.string().uuid('Cardiologist ID must be a valid UUID').optional(),
    startTime: z.string().datetime('Start time must be a valid ISO datetime').optional().nullable(),
    endTime: z.string().datetime('End time must be a valid ISO datetime').optional().nullable(),
    outcome: z.string().trim().max(500, 'Outcome must be 500 characters or less').optional().nullable(),
  })
  .refine(
    (data) => !data.startTime || !data.endTime || new Date(data.endTime).getTime() >= new Date(data.startTime).getTime(),
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    }
  )

export type CathLabProcedureSchemaInput = z.infer<typeof CathLabProcedureSchema>
