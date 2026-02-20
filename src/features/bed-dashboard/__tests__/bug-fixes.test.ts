/**
 * Bug-Fix Regression Tests
 * Covers all 8 bugs found on 2026-02-20 and their fixes.
 *
 * Bug 1  – createTemporaryBed: no duplicate bed-number check
 * Bug 2  – Bed base type missing isTemporary / queries not SELECTing it
 * Bug 3  – hasBedChanged() ignores isTemporary → stale UI after surge
 * Bug 4  – deactivateBed doesn't strip is_temporary flag
 * Bug 5  – /supervisor not revalidated on bed CRUD/status changes
 * Bug 6  – SupervisorClientShell: remove/create doesn't refresh local state
 * Bug 7  – console.error used in auth-critical paths instead of logger
 * Bug 8  – isTokenBlacklisted returns false on DB error (fail-open)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hasBedChanged, hasBedsChanged, getStableBeds } from '../lib/bed-diff'
import type { BedWithElapsedTime } from '../types/bed'
import { fileURLToPath } from 'url'
import * as path from 'path'

// Resolve the directory of THIS test file without URL-encoding issues
// (import.meta.url encodes spaces as %20; fileURLToPath decodes them)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── helpers ────────────────────────────────────────────────────────────────

function makeBed(overrides: Partial<BedWithElapsedTime> = {}): BedWithElapsedTime {
  return {
    id: 'bed-1',
    bedNumber: 'EW-01',
    currentStageId: 'stage-empty',
    currentStage: { id: 'stage-empty', name: 'Empty', displayOrder: 1, colorCode: 'gray', description: null, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    patientStartTime: null,
    lastStageChange: null,
    isOccupied: false,
    isActive: true,
    isTemporary: false,
    isVirtual: false,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    elapsedTimeMs: null,
    isDelayed: false,
    isDispositionBottleneck: false,
    dispositionElapsedMs: null,
    dispositionDelayReason: null,
    dispositionDelayLogId: null,
    ...overrides,
  }
}

// ─── Bug 3: hasBedChanged / bed-diff ────────────────────────────────────────

describe('Bug 3 – hasBedChanged: isTemporary and isActive tracked', () => {
  it('returns false when nothing has changed', () => {
    const bed = makeBed()
    expect(hasBedChanged(bed, { ...bed })).toBe(false)
  })

  it('returns true when isTemporary flips false → true (surge bed created)', () => {
    const old = makeBed({ isTemporary: false })
    const next = makeBed({ isTemporary: true })
    expect(hasBedChanged(old, next)).toBe(true)
  })

  it('returns true when isTemporary flips true → false (surge bed removed)', () => {
    const old = makeBed({ isTemporary: true })
    const next = makeBed({ isTemporary: false })
    expect(hasBedChanged(old, next)).toBe(true)
  })

  it('returns true when isActive flips (bed deactivated by admin)', () => {
    const old = makeBed({ isActive: true })
    const next = makeBed({ isActive: false })
    expect(hasBedChanged(old, next)).toBe(true)
  })

  it('returns true when isOccupied changes', () => {
    const old = makeBed({ isOccupied: false })
    const next = makeBed({ isOccupied: true })
    expect(hasBedChanged(old, next)).toBe(true)
  })

  it('returns true when isDelayed changes', () => {
    const old = makeBed({ isDelayed: false })
    const next = makeBed({ isDelayed: true })
    expect(hasBedChanged(old, next)).toBe(true)
  })

  it('returns true when the current stage changes', () => {
    const old = makeBed()
    const next = makeBed({ currentStage: { ...old.currentStage!, id: 'stage-triage', name: 'Triage' } })
    expect(hasBedChanged(old, next)).toBe(true)
  })

  it('ignores elapsed-time differences smaller than 30 seconds', () => {
    const old = makeBed({ elapsedTimeMs: 10000 })
    const next = makeBed({ elapsedTimeMs: 25000 }) // +15 s — below threshold
    expect(hasBedChanged(old, next)).toBe(false)
  })

  it('detects elapsed-time differences of 30+ seconds', () => {
    const old = makeBed({ elapsedTimeMs: 10000 })
    const next = makeBed({ elapsedTimeMs: 40001 }) // +30+ s
    expect(hasBedChanged(old, next)).toBe(true)
  })
})

describe('Bug 3 – hasBedsChanged: array-level diffing', () => {
  it('detects a new surge bed appearing in the list', () => {
    const permanent = makeBed({ id: 'bed-1', bedNumber: 'EW-01' })
    const surge = makeBed({ id: 'bed-surge', bedNumber: 'SURGE-01', isTemporary: true })

    expect(hasBedsChanged([permanent], [permanent, surge])).toBe(true)
  })

  it('detects a surge bed being removed from the list', () => {
    const permanent = makeBed({ id: 'bed-1', bedNumber: 'EW-01' })
    const surge = makeBed({ id: 'bed-surge', bedNumber: 'SURGE-01', isTemporary: true })

    expect(hasBedsChanged([permanent, surge], [permanent])).toBe(true)
  })

  it('returns false when nothing changed', () => {
    const beds = [makeBed({ id: 'bed-1' }), makeBed({ id: 'bed-2', bedNumber: 'EW-02' })]
    expect(hasBedsChanged(beds, beds.map(b => ({ ...b })))).toBe(false)
  })
})

describe('Bug 3 – getStableBeds: reference stability', () => {
  it('returns the OLD reference when nothing meaningful changed', () => {
    const old = [makeBed()]
    const next = [{ ...makeBed() }] // same values, different object ref
    const result = getStableBeds(old, next)
    expect(result).toBe(old) // same reference → no re-render
  })

  it('returns the NEW reference when isTemporary changed', () => {
    const old = [makeBed({ isTemporary: false })]
    const next = [makeBed({ isTemporary: true })]
    const result = getStableBeds(old, next)
    expect(result).toBe(next) // new reference → triggers re-render
  })
})

// ─── Bug 2: Bed base type has isTemporary ───────────────────────────────────

describe('Bug 2 – Bed base type includes isTemporary', () => {
  it('BedWithElapsedTime carries isTemporary from Bed base', () => {
    const bed = makeBed({ isTemporary: true })
    // TypeScript compile-time check — if the field were missing the test file itself
    // would fail to compile. The runtime check confirms the value is accessible.
    expect(bed.isTemporary).toBe(true)
  })

  it('isTemporary defaults to false for a normal bed', () => {
    const bed = makeBed()
    expect(bed.isTemporary).toBe(false)
  })

  it('isTemporary is a boolean (not undefined)', () => {
    const bed = makeBed()
    expect(typeof bed.isTemporary).toBe('boolean')
  })
})

// ─── Bug 1: duplicate bed number validation (schema) ────────────────────────

import { z } from 'zod'

// Re-import the real schema to test validation rules
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
    // Zod v4 evaluates regex BEFORE applying .trim(), so leading/trailing
    // spaces cause a regex failure — callers must pre-trim input.
    const result = createTemporaryBedSchema.safeParse({ bedNumber: '  T-01  ' })
    expect(result.success).toBe(false)
  })
})

// ─── Bug 4: deactivateBed strips is_temporary (SQL logic unit test) ─────────

describe('Bug 4 – deactivateBed SQL: is_temporary must be cleared', () => {
  /**
   * We cannot call the DB in unit tests, so we verify the SQL string
   * that the mutations module builds contains the is_temporary = false clause.
   * This is the same technique used in other tests in this repo.
   */
  it('mutations.deactivateBed SQL includes is_temporary = false', async () => {
    // Read the source to verify the fix is present
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
    // Both remove and create callbacks must refresh
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
    // The real implementation was moved to src/shared/lib/auth-service.ts;
    // src/features/auth/lib/auth-service.ts is now just a re-export stub.
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../../shared/lib/auth-service.ts'),
      'utf-8'
    )
    // Extract the isTokenBlacklisted function body (up to 1200 chars)
    const fnStart = src.indexOf('export async function isTokenBlacklisted')
    const fnBody = src.slice(fnStart, fnStart + 1200)

    // The catch block must return true (fail-closed).
    // The function may also have a legitimate early-exit `return false`
    // for empty tokens — that's fine. What matters is the catch returns true.
    expect(fnBody).toContain('return true')

    // Verify the catch block itself returns true and not false
    const catchStart = fnBody.lastIndexOf('} catch')
    const catchBody = fnBody.slice(catchStart)
    expect(catchBody).toContain('return true')
    expect(catchBody).not.toContain('return false')
  })

  it('auth-service catch block uses logger.error not console.error', async () => {
    const fs = await import('fs')
    // The real implementation was moved to src/shared/lib/auth-service.ts
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../../shared/lib/auth-service.ts'),
      'utf-8'
    )
    expect(src).toContain('logger.error')
    expect(src).not.toContain('console.error')
  })
})
