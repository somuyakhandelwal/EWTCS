import { z } from 'zod'

/**
 * Historical Admission CSV Row Shape
 * Expected columns: bed_number, admitted_at, discharged_at, discharged_by_username, notes
 */
export const HistoricalAdmissionSchema = z.object({
    bed_number: z.string().min(1, 'Bed number is required'),
    admitted_at: z.string().datetime({ message: 'Invalid admission date (ISO 8601 required)' }),
    discharged_at: z.string().datetime({ message: 'Invalid discharge date (ISO 8601 required)' }),
    discharged_by_username: z.string().min(1, 'Discharged by username is required'),
    notes: z.string().optional().nullable(),
}).refine((data) => {
    const admit = new Date(data.admitted_at).getTime()
    const discharge = new Date(data.discharged_at).getTime()
    return discharge > admit
}, {
    message: 'Discharge time must be after admission time',
    path: ['discharged_at'],
})

export type HistoricalAdmission = z.infer<typeof HistoricalAdmissionSchema>

export interface ImportResult {
    successCount: number
    failureCount: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    errors: { row: number; error: string; data?: any }[]
}
