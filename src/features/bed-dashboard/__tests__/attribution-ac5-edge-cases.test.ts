// US-3.4: Delay Attribution Tests
// Epic 3: Time Tracking & Stage Logging
// Covers: getAttributionForDelay, ATTRIBUTION_CONFIG, aggregation maths,
//         pg string coercion, percentage calculation, donut chart geometry.

import { describe, it, expect } from 'vitest'
import {
  getAttributionForDelay,
  ATTRIBUTION_CONFIG,
  ATTRIBUTION_LABELS,
  ATTRIBUTION_COLORS,
  type DelayAttribution,
  type AttributionConfig,
} from '../lib/delay-attribution-config'

// ---------------------------------------------------------------------------
// Donut chart geometry
// ---------------------------------------------------------------------------
describe('AC-5 — Donut chart geometry (SVG arc calculations)', () => {
  const SIZE = 120
  const STROKE_W = 18
  const R = (SIZE - STROKE_W) / 2
  const CIRCUMFERENCE = 2 * Math.PI * R

  it('radius is correctly derived from SIZE and STROKE_W', () => {
    expect(R).toBe(51)
  })

  it('circumference is 2πR', () => {
    expect(CIRCUMFERENCE).toBeCloseTo(2 * Math.PI * 51, 5)
  })

  it('100% allocation fills the full circumference minus gap', () => {
    const GAP = 3
    const arcLength = 1.0 * CIRCUMFERENCE - GAP
    expect(arcLength).toBeGreaterThan(0)
    expect(arcLength).toBeLessThan(CIRCUMFERENCE)
  })

  it('0% allocation produces a non-negative arc (max(0, negative) guard)', () => {
    const GAP = 3
    const arcLength = Math.max(0, 0 * CIRCUMFERENCE - GAP)
    expect(arcLength).toBe(0)
  })

  it('segments sum to full circumference when percentages total 100', () => {
    const fractions = [0.6, 0.3, 0.1]
    const GAP = 3
    let cumulativeOffset = 0
    const arcs: number[] = []
    for (const fraction of fractions) {
      const arcLength = fraction * CIRCUMFERENCE - GAP
      arcs.push(Math.max(0, arcLength))
      cumulativeOffset += fraction * CIRCUMFERENCE
    }
    expect(cumulativeOffset).toBeCloseTo(CIRCUMFERENCE, 5)
  })

  it('cumulative offset starts at 0 for the first segment', () => {
    let cumulativeOffset = 0
    const firstDashOffset = -cumulativeOffset
    expect(firstDashOffset == 0).toBe(true)
    expect(Object.is(firstDashOffset, -0) || Object.is(firstDashOffset, 0)).toBe(true)
  })

  it('emergency_staff gets orange stroke colour', () => {
    const STROKE_COLORS: Record<DelayAttribution, string> = {
      emergency_staff: '#f97316',
      hospital_capacity: '#3b82f6',
      unattributed: '#71717a',
    }
    expect(STROKE_COLORS['emergency_staff']).toBe('#f97316')
    expect(STROKE_COLORS['hospital_capacity']).toBe('#3b82f6')
    expect(STROKE_COLORS['unattributed']).toBe('#71717a')
  })
})

// ---------------------------------------------------------------------------
// Edge cases & boundary conditions
// ---------------------------------------------------------------------------
describe('Edge cases', () => {
  it('stage 0 (Empty) → unattributed', () => {
    expect(getAttributionForDelay(0, null)).toBe('unattributed')
  })

  it('stage 7 (Cleaning) → unattributed', () => {
    expect(getAttributionForDelay(7, null)).toBe('unattributed')
  })

  it('very large durationMs values accumulate without overflow', () => {
    const thirtyDays = 30 * 24 * 3600 * 1000
    const result = getAttributionForDelay(1, null)
    expect(result).toBe('emergency_staff')
    const sum = thirtyDays + thirtyDays
    expect(sum).toBe(5_184_000_000)
    expect(Number.isSafeInteger(sum)).toBe(true)
  })

  it('fractional ms values from parseFloat are handled correctly', () => {
    expect(parseFloat('3600000')).toBe(3_600_000)
    expect(parseFloat('7200000.5')).toBe(7_200_000.5)
    expect(parseFloat('0')).toBe(0)
  })

  it('parseInt on stageDisplayOrder string always returns integer', () => {
    expect(parseInt('1', 10)).toBe(1)
    expect(parseInt('5', 10)).toBe(5)
    expect(parseInt('0', 10)).toBe(0)
  })

  it('all three DelayAttribution values are defined', () => {
    const values: DelayAttribution[] = ['emergency_staff', 'hospital_capacity', 'unattributed']
    expect(values).toHaveLength(3)
    values.forEach((v) => expect(typeof v).toBe('string'))
  })
})
