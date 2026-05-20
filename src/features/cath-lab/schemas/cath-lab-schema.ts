import { z } from 'zod'

export const CathLabProcedureSchema = z
  .object({
    procedureType: z.enum(['CAG', 'PTCA']),
    patientUhid: z.string().trim().min(1, 'Patient UHID is required').max(100, 'Patient UHID is too long'),
    cardiologistId: z.preprocess(
      (value) => value === '' ? null : value,
      z.string().uuid('Select a valid cardiologist').nullable().optional()
    ),
    actualStartTime: z.string().datetime('Start time must be a valid ISO datetime'),
    actualEndTime: z.string().datetime('End time must be a valid ISO datetime'),
    outcome: z.string().trim().min(1, 'Outcome is required').max(500, 'Outcome must be 500 characters or less'),
    clinicalNotes: z.string().trim().max(1000, 'Notes must be 1000 characters or less').nullable().optional(),
  })
  .refine((data) => new Date(data.actualEndTime).getTime() >= new Date(data.actualStartTime).getTime(), {
    message: 'End time must be after start time',
    path: ['actualEndTime'],
  })

export type CathLabProcedureSchemaInput = z.infer<typeof CathLabProcedureSchema>
