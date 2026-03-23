import { describe, expect, it } from 'vitest'
import { CathLabProcedureSchema } from '../cath-lab-schema'

describe('CathLabProcedureSchema', () => {
  it('accepts valid CAG payload', () => {
    const result = CathLabProcedureSchema.safeParse({
      procedureType: 'CAG',
      patientId: 'UHID-12345',
      cardiologist: 'Dr. Rao',
      startTime: '2026-03-18T09:00:00.000Z',
      endTime: '2026-03-18T09:45:00.000Z',
      outcome: 'Procedure completed successfully',
    })

    expect(result.success).toBe(true)
  })

  it('rejects invalid procedure type', () => {
    const result = CathLabProcedureSchema.safeParse({
      procedureType: 'ECHO',
      patientId: 'UHID-12345',
      cardiologist: 'Dr. Rao',
      startTime: '2026-03-18T09:00:00.000Z',
      endTime: '2026-03-18T09:45:00.000Z',
      outcome: 'Done',
    })

    expect(result.success).toBe(false)
  })

  it('rejects end time before start time', () => {
    const result = CathLabProcedureSchema.safeParse({
      procedureType: 'PTCA',
      patientId: 'UHID-12345',
      cardiologist: 'Dr. Rao',
      startTime: '2026-03-18T10:00:00.000Z',
      endTime: '2026-03-18T09:45:00.000Z',
      outcome: 'Complication handled',
    })

    expect(result.success).toBe(false)
  })
})
