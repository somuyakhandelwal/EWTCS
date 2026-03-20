import { z } from 'zod'

export const CathLabProcedureSchema = z
  .object({
    procedureType: z.enum(['CAG', 'PTCA']),
    patientId: z.string().trim().min(1, 'Patient ID is required').max(100, 'Patient ID is too long'),
    cardiologist: z.string().trim().min(1, 'Cardiologist name is required').max(120, 'Cardiologist name is too long'),
    startTime: z.string().datetime('Start time must be a valid ISO datetime'),
    endTime: z.string().datetime('End time must be a valid ISO datetime'),
    outcome: z.string().trim().min(1, 'Outcome is required').max(500, 'Outcome must be 500 characters or less'),
  })
  .refine((data) => new Date(data.endTime).getTime() >= new Date(data.startTime).getTime(), {
    message: 'End time must be after start time',
    path: ['endTime'],
  })

export type CathLabProcedureSchemaInput = z.infer<typeof CathLabProcedureSchema>
