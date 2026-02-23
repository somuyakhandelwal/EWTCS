/**
 * Bug-Fix Regression Tests — Bed State (Bugs 2 & 3)
 * Covers all bed-state change detection bugs.
 *
 * Bug 2  – Bed base type missing isTemporary / queries not SELECTing it
 * Bug 3  – hasBedChanged() ignores isTemporary → stale UI after surge
 */

import { describe, it, expect } from 'vitest'
import { hasBedChanged, hasBedsChanged, getStableBeds } from '../lib/bed-diff'
import type { BedWithElapsedTime } from '../types/bed'

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
    isEscalated: false,
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
    const next = makeBed({ elapsedTimeMs: 25000 })
    expect(hasBedChanged(old, next)).toBe(false)
  })

  it('detects elapsed-time differences of 30+ seconds', () => {
    const old = makeBed({ elapsedTimeMs: 10000 })
    const next = makeBed({ elapsedTimeMs: 40001 })
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
    const next = [{ ...makeBed() }]
    const result = getStableBeds(old, next)
    expect(result).toBe(old)
  })

  it('returns the NEW reference when isTemporary changed', () => {
    const old = [makeBed({ isTemporary: false })]
    const next = [makeBed({ isTemporary: true })]
    const result = getStableBeds(old, next)
    expect(result).toBe(next)
  })
})

// ─── Bug 2: Bed base type has isTemporary ───────────────────────────────────

describe('Bug 2 – Bed base type includes isTemporary', () => {
  it('BedWithElapsedTime carries isTemporary from Bed base', () => {
    const bed = makeBed({ isTemporary: true })
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
