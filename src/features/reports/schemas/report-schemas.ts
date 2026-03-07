// Report Schemas
// EPIC 10: Management Report Dashboard

import { z } from 'zod'

const dateRe = /^\d{4}-\d{2}-\d{2}$/

export const reportFilterSchema = z.object({
  startDate: z.string().regex(dateRe, 'Invalid start date').optional(),
  endDate:   z.string().regex(dateRe, 'Invalid end date').optional(),
  shiftId:   z.string().uuid().optional(),
})

export type ReportFilterInput = z.infer<typeof reportFilterSchema>
