import { describe, expect, it } from 'vitest'
import { CathLabProcedureSchema } from '../cath-lab-schema'

describe('CathLabProcedureSchema', () => {
  it('accepts valid CAG payload', () => {
    const result = CathLabProcedureSchema.safeParse({
      procedureType: 'CAG',
      patientUhid: 'UHID-12345',
      cardiologistId: '550e8400-e29b-41d4-a716-446655440000',
      actualStartTime: '2026-03-18T09:00:00.000Z',
      actualEndTime: '2026-03-18T09:45:00.000Z',
      outcome: 'Procedure completed successfully',
    })

    expect(result.success).toBe(true)
  })

  it('rejects invalid procedure type', () => {
    const result = CathLabProcedureSchema.safeParse({
      procedureType: 'ECHO',
      patientUhid: 'UHID-12345',
      cardiologistId: '550e8400-e29b-41d4-a716-446655440000',
      actualStartTime: '2026-03-18T09:00:00.000Z',
      actualEndTime: '2026-03-18T09:45:00.000Z',
      outcome: 'Done',
    })

    expect(result.success).toBe(false)
  })

  it('rejects end time before start time', () => {
    const result = CathLabProcedureSchema.safeParse({
      procedureType: 'PTCA',
      patientUhid: 'UHID-12345',
      cardiologistId: '550e8400-e29b-41d4-a716-446655440000',
      actualStartTime: '2026-03-18T10:00:00.000Z',
      actualEndTime: '2026-03-18T09:45:00.000Z',
      outcome: 'Complication handled',
    })

    expect(result.success).toBe(false)
  })
})
