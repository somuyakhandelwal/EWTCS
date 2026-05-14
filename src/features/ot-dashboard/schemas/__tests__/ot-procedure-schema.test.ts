import { describe, expect, it } from 'vitest'
import { OTProcedureFinishSchema, OTProcedureStartSchema } from '../ot-procedure-schema'

describe('OTProcedureStartSchema', () => {
  it('accepts valid start payload', () => {
    const result = OTProcedureStartSchema.safeParse({
      roomId: '550e8400-e29b-41d4-a716-446655440000',
      procedureName: 'Laparoscopic Appendectomy',
    })

    expect(result.success).toBe(true)
  })

  it('rejects missing procedure name', () => {
    const result = OTProcedureStartSchema.safeParse({
      roomId: '550e8400-e29b-41d4-a716-446655440000',
      procedureName: ' ',
    })

    expect(result.success).toBe(false)
  })
})

describe('OTProcedureFinishSchema', () => {
  it('accepts valid finish payload', () => {
    const result = OTProcedureFinishSchema.safeParse({
      roomId: '550e8400-e29b-41d4-a716-446655440000',
    })

    expect(result.success).toBe(true)
  })

  it('rejects invalid room id', () => {
    const result = OTProcedureFinishSchema.safeParse({ roomId: 'ot-01' })

    expect(result.success).toBe(false)
  })
})
