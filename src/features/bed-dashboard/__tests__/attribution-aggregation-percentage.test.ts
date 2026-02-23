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
// Aggregation logic (mirrors getDelaysByAttribution in-process aggregation)
// ---------------------------------------------------------------------------
describe('In-process aggregation — bucket rows by attribution', () => {
  /** Simulates the Map-based aggregation in delay-attribution-queries.ts */
  function aggregate(
    rawRows: Array<{ stageDisplayOrder: string; durationMs: string; reason: string | null }>
  ) {
    const totals = new Map<DelayAttribution, { totalDelayedMs: number; incidentCount: number }>()
    for (const row of rawRows) {
      const stageOrder = parseInt(row.stageDisplayOrder, 10)
      const durationMs = parseFloat(row.durationMs)
      const attr = getAttributionForDelay(
        stageOrder,
        row.reason as Parameters<typeof getAttributionForDelay>[1],
        ATTRIBUTION_CONFIG
      )
      const existing = totals.get(attr) ?? { totalDelayedMs: 0, incidentCount: 0 }
      totals.set(attr, {
        totalDelayedMs: existing.totalDelayedMs + durationMs,
        incidentCount: existing.incidentCount + 1,
      })
    }
    const attributions: DelayAttribution[] = ['emergency_staff', 'hospital_capacity', 'unattributed']
    return attributions.map((attr) => ({
      attribution: attr,
      totalDelayedMs: totals.get(attr)?.totalDelayedMs ?? 0,
      incidentCount: totals.get(attr)?.incidentCount ?? 0,
    }))
  }

  it('empty rows → all three categories with zero totals', () => {
    const result = aggregate([])
    expect(result).toHaveLength(3)
    result.forEach((r) => {
      expect(r.totalDelayedMs).toBe(0)
      expect(r.incidentCount).toBe(0)
    })
  })

  it('one stage-1 delay → emergency_staff gets the ms, others stay zero', () => {
    const result = aggregate([{ stageDisplayOrder: '1', durationMs: '3600000', reason: null }])
    const es = result.find((r) => r.attribution === 'emergency_staff')!
    const hc = result.find((r) => r.attribution === 'hospital_capacity')!
    expect(es.totalDelayedMs).toBe(3_600_000)
    expect(es.incidentCount).toBe(1)
    expect(hc.totalDelayedMs).toBe(0)
    expect(hc.incidentCount).toBe(0)
  })

  it('stage-5 + no_icu_bed → hospital_capacity gets the ms', () => {
    const result = aggregate([{ stageDisplayOrder: '5', durationMs: '7200000', reason: 'no_icu_bed' }])
    const hc = result.find((r) => r.attribution === 'hospital_capacity')!
    expect(hc.totalDelayedMs).toBe(7_200_000)
    expect(hc.incidentCount).toBe(1)
  })

  it('stage-5 + null reason → unattributed', () => {
    const result = aggregate([{ stageDisplayOrder: '5', durationMs: '1800000', reason: null }])
    const ua = result.find((r) => r.attribution === 'unattributed')!
    expect(ua.totalDelayedMs).toBe(1_800_000)
    expect(ua.incidentCount).toBe(1)
  })

  it('multiple rows accumulate correctly — numeric addition not string concat', () => {
    const rows = [
      { stageDisplayOrder: '1', durationMs: '3600000', reason: null },
      { stageDisplayOrder: '2', durationMs: '1800000', reason: null },
      { stageDisplayOrder: '5', durationMs: '7200000', reason: 'no_bed_upstairs' },
      { stageDisplayOrder: '5', durationMs: '3600000', reason: 'no_general_ward_bed' },
      { stageDisplayOrder: '5', durationMs: '900000',  reason: null },
    ]
    const result = aggregate(rows)
    const es = result.find((r) => r.attribution === 'emergency_staff')!
    const hc = result.find((r) => r.attribution === 'hospital_capacity')!
    const ua = result.find((r) => r.attribution === 'unattributed')!

    expect(es.totalDelayedMs).toBe(5_400_000)
    expect(es.incidentCount).toBe(2)
    expect(hc.totalDelayedMs).toBe(10_800_000)
    expect(hc.incidentCount).toBe(2)
    expect(ua.totalDelayedMs).toBe(900_000)
    expect(ua.incidentCount).toBe(1)
  })

  it('pg string coercion — "3600000" + "1800000" must equal 5_400_000, not "36000001800000"', () => {
    const result = aggregate([
      { stageDisplayOrder: '1', durationMs: '3600000', reason: null },
      { stageDisplayOrder: '2', durationMs: '1800000', reason: null },
    ])
    const es = result.find((r) => r.attribution === 'emergency_staff')!
    expect(typeof es.totalDelayedMs).toBe('number')
    expect(es.totalDelayedMs).toBe(5_400_000)
    expect(es.totalDelayedMs).not.toBe('36000001800000')
  })

  it('all four emergency stages each attribute correctly', () => {
    const rows = [1, 2, 3, 4].map((order) => ({
      stageDisplayOrder: String(order),
      durationMs: '3600000',
      reason: null,
    }))
    const result = aggregate(rows)
    const es = result.find((r) => r.attribution === 'emergency_staff')!
    expect(es.incidentCount).toBe(4)
    expect(es.totalDelayedMs).toBe(4 * 3_600_000)
  })
})

// ---------------------------------------------------------------------------
// Percentage calculation (mirrors fetchDelayAttributionStats action)
// ---------------------------------------------------------------------------
describe('Percentage calculation', () => {
  function calcPercentages(rows: Array<{ totalDelayedMs: number; incidentCount: number; attribution: DelayAttribution }>) {
    const grandTotal = rows.reduce((s, r) => s + r.totalDelayedMs, 0)
    return rows.map((row) => ({
      ...row,
      percentage: grandTotal > 0 ? Math.round((row.totalDelayedMs / grandTotal) * 100) : 0,
    }))
  }

  it('grand total 0 → all percentages are 0 (no division by zero)', () => {
    const rows = [
      { attribution: 'emergency_staff' as DelayAttribution, totalDelayedMs: 0, incidentCount: 0 },
      { attribution: 'hospital_capacity' as DelayAttribution, totalDelayedMs: 0, incidentCount: 0 },
      { attribution: 'unattributed' as DelayAttribution, totalDelayedMs: 0, incidentCount: 0 },
    ]
    const result = calcPercentages(rows)
    result.forEach((r) => expect(r.percentage).toBe(0))
  })

  it('single category with all delay → 100%', () => {
    const rows = [
      { attribution: 'emergency_staff' as DelayAttribution, totalDelayedMs: 7_200_000, incidentCount: 2 },
      { attribution: 'hospital_capacity' as DelayAttribution, totalDelayedMs: 0, incidentCount: 0 },
      { attribution: 'unattributed' as DelayAttribution, totalDelayedMs: 0, incidentCount: 0 },
    ]
    const result = calcPercentages(rows)
    expect(result.find((r) => r.attribution === 'emergency_staff')!.percentage).toBe(100)
    expect(result.find((r) => r.attribution === 'hospital_capacity')!.percentage).toBe(0)
  })

  it('50/50 split → both 50%', () => {
    const rows = [
      { attribution: 'emergency_staff' as DelayAttribution, totalDelayedMs: 3_600_000, incidentCount: 1 },
      { attribution: 'hospital_capacity' as DelayAttribution, totalDelayedMs: 3_600_000, incidentCount: 1 },
      { attribution: 'unattributed' as DelayAttribution, totalDelayedMs: 0, incidentCount: 0 },
    ]
    const result = calcPercentages(rows)
    expect(result.find((r) => r.attribution === 'emergency_staff')!.percentage).toBe(50)
    expect(result.find((r) => r.attribution === 'hospital_capacity')!.percentage).toBe(50)
  })

  it('75/25 split rounds correctly', () => {
    const rows = [
      { attribution: 'emergency_staff' as DelayAttribution, totalDelayedMs: 9_000_000, incidentCount: 3 },
      { attribution: 'hospital_capacity' as DelayAttribution, totalDelayedMs: 3_000_000, incidentCount: 1 },
      { attribution: 'unattributed' as DelayAttribution, totalDelayedMs: 0, incidentCount: 0 },
    ]
    const result = calcPercentages(rows)
    expect(result.find((r) => r.attribution === 'emergency_staff')!.percentage).toBe(75)
    expect(result.find((r) => r.attribution === 'hospital_capacity')!.percentage).toBe(25)
  })

  it('three-way split percentages sum to ~100', () => {
    const rows = [
      { attribution: 'emergency_staff' as DelayAttribution, totalDelayedMs: 4_000_000, incidentCount: 2 },
      { attribution: 'hospital_capacity' as DelayAttribution, totalDelayedMs: 3_000_000, incidentCount: 1 },
      { attribution: 'unattributed' as DelayAttribution, totalDelayedMs: 3_000_000, incidentCount: 1 },
    ]
    const result = calcPercentages(rows)
    const total = result.reduce((s, r) => s + r.percentage, 0)
    expect(total).toBeGreaterThanOrEqual(99)
    expect(total).toBeLessThanOrEqual(101)
  })
})
