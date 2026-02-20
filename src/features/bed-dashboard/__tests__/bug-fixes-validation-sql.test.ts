/**
 * Bug-Fix Regression Tests — Validation, SQL & Auth (Bugs 1, 4–8)
 *
 * Bug 1  – createTemporaryBed: no duplicate bed-number check
 * Bug 4  – deactivateBed doesn't strip is_temporary flag
 * Bug 5  – /supervisor not revalidated on bed CRUD/status changes
 * Bug 6  – SupervisorClientShell: remove/create doesn't refresh local state
 * Bug 7  – console.error used in auth-critical paths instead of logger
 * Bug 8  – isTokenBlacklisted returns false on DB error (fail-open)
 */

import { describe, it, expect } from 'vitest'
import { fileURLToPath } from 'url'
import * as path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Bug 1: duplicate bed number validation (schema) ────────────────────────

import { createTemporaryBedSchema } from '../../bed-management/schemas/bed-management-schemas'

describe('Bug 1 – createTemporaryBedSchema validation', () => {
  it('accepts a valid bed number', () => {
    const result = createTemporaryBedSchema.safeParse({ bedNumber: 'SURGE-01' })
    expect(result.success).toBe(true)
  })

  it('rejects a bed number that is too short (< 2 chars)', () => {
    const result = createTemporaryBedSchema.safeParse({ bedNumber: 'A' })
    expect(result.success).toBe(false)
  })

  it('rejects a bed number with special characters', () => {
    const result = createTemporaryBedSchema.safeParse({ bedNumber: 'SURGE #1' })
    expect(result.success).toBe(false)
  })

  it('rejects a bed number longer than 50 characters', () => {
    const result = createTemporaryBedSchema.safeParse({ bedNumber: 'A'.repeat(51) })
    expect(result.success).toBe(false)
  })

  it('accepts an optional location', () => {
    const result = createTemporaryBedSchema.safeParse({ bedNumber: 'T-01', location: 'Corridor 3' })
    expect(result.success).toBe(true)
  })

  it('accepts missing location (location is optional)', () => {
    const result = createTemporaryBedSchema.safeParse({ bedNumber: 'T-01' })
    expect(result.success).toBe(true)
  })

  it('rejects a location longer than 255 characters', () => {
    const result = createTemporaryBedSchema.safeParse({ bedNumber: 'T-01', location: 'X'.repeat(256) })
    expect(result.success).toBe(false)
  })

  it('rejects whitespace-padded bed number (regex runs before trim in Zod v4)', () => {
    const result = createTemporaryBedSchema.safeParse({ bedNumber: '  T-01  ' })
    expect(result.success).toBe(false)
  })
})

// ─── Bug 4: deactivateBed strips is_temporary (SQL logic unit test) ─────────

describe('Bug 4 – deactivateBed SQL: is_temporary must be cleared', () => {
  it('mutations.deactivateBed SQL includes is_temporary = false', async () => {
    const fs = await import('fs')
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../bed-management/lib/mutations.ts'),
      'utf-8'
    )
    expect(src).toContain('is_temporary = false')
  })
})

// ─── Bug 5: revalidateBedPages includes /supervisor ─────────────────────────

describe('Bug 5 – revalidateBedPages covers /supervisor', () => {
  it('bed-status-actions revalidateBedPages includes /supervisor', async () => {
    const fs = await import('fs')
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../bed-management/actions/bed-status-actions.ts'),
      'utf-8'
    )
    expect(src).toContain("revalidatePath('/supervisor')")
  })

  it('bed-crud-actions revalidateBedPages includes /supervisor', async () => {
    const fs = await import('fs')
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../bed-management/actions/bed-crud-actions.ts'),
      'utf-8'
    )
    expect(src).toContain("revalidatePath('/supervisor')")
  })

  it('temporary-bed-actions already revalidates /supervisor', async () => {
    const fs = await import('fs')
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../bed-management/actions/temporary-bed-actions.ts'),
      'utf-8'
    )
    expect(src).toContain("revalidatePath('/supervisor')")
  })
})

// ─── Bug 6: SupervisorClientShell refreshes after remove/create ─────────────

describe('Bug 6 – SupervisorClientShell calls refreshData after mutations', () => {
  it('shell source calls refreshData after removeTemporaryBed', async () => {
    const fs = await import('fs')
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../../app/supervisor/SupervisorClientShell.tsx'),
      'utf-8'
    )
    expect(src).toContain('refreshData')
    expect(src).toContain('await refreshData()')
  })

  it('shell source calls refreshData in onCreated callback', async () => {
    const fs = await import('fs')
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../../app/supervisor/SupervisorClientShell.tsx'),
      'utf-8'
    )
    const refreshCount = (src.match(/await refreshData\(\)/g) ?? []).length
    expect(refreshCount).toBeGreaterThanOrEqual(2)
  })
})

// ─── Bug 7: logger used instead of console.error in auth paths ──────────────

describe('Bug 7 – No raw console.error in auth-critical files', () => {
  const authFiles = [
    '../../auth/lib/auth-service.ts',
    '../../auth/actions/auth-actions.ts',
    '../../../app/api/auth/logout/route.ts',
  ] as const

  for (const rel of authFiles) {
    it(`${rel} does not use console.error`, async () => {
      const fs = await import('fs')
      const src = fs.readFileSync(
        path.resolve(__dirname, rel),
        'utf-8'
      )
      expect(src).not.toContain('console.error')
    })
  }

  it('kiosk-admin-actions.ts does not use console.error', async () => {
    const fs = await import('fs')
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../user-management/actions/kiosk-admin-actions.ts'),
      'utf-8'
    )
    expect(src).not.toContain('console.error')
  })
})

// ─── Bug 8: isTokenBlacklisted fails closed on DB error ─────────────────────

describe('Bug 8 – isTokenBlacklisted fails closed on DB error', () => {
  it('auth-service source returns true (not false) in catch block', async () => {
    const fs = await import('fs')
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../../shared/lib/auth-service.ts'),
      'utf-8'
    )
    const fnStart = src.indexOf('export async function isTokenBlacklisted')
    const fnBody = src.slice(fnStart, fnStart + 1200)

    expect(fnBody).toContain('return true')

    const catchStart = fnBody.lastIndexOf('} catch')
    const catchBody = fnBody.slice(catchStart)
    expect(catchBody).toContain('return true')
    expect(catchBody).not.toContain('return false')
  })

  it('auth-service catch block uses logger.error not console.error', async () => {
    const fs = await import('fs')
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../../shared/lib/auth-service.ts'),
      'utf-8'
    )
    expect(src).toContain('logger.error')
    expect(src).not.toContain('console.error')
  })
})
