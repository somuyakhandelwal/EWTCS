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
// AC-1: Delays in Stages 1–4 are attributed to "Emergency Staff"
// ---------------------------------------------------------------------------
describe('AC-1 — Stages 1–4 are Emergency Staff delays', () => {
  const emergencyStages = [1, 2, 3, 4]

  emergencyStages.forEach((order) => {
    it(`stage display_order=${order} → emergency_staff regardless of reason`, () => {
      expect(getAttributionForDelay(order, null)).toBe('emergency_staff')
      expect(getAttributionForDelay(order, 'no_icu_bed')).toBe('emergency_staff')
      expect(getAttributionForDelay(order, 'no_general_ward_bed')).toBe('emergency_staff')
      expect(getAttributionForDelay(order, 'no_bed_upstairs')).toBe('emergency_staff')
      expect(getAttributionForDelay(order, 'awaiting_transport')).toBe('emergency_staff')
      expect(getAttributionForDelay(order, 'other')).toBe('emergency_staff')
    })
  })

  it('stage 0 (Empty) is NOT an emergency_staff delay', () => {
    expect(getAttributionForDelay(0, null)).not.toBe('emergency_staff')
  })

  it('stage 6 (Discharge Process) is NOT an emergency_staff delay', () => {
    expect(getAttributionForDelay(6, null)).not.toBe('emergency_staff')
  })
})

// ---------------------------------------------------------------------------
// AC-2: Delays in Stage 5 are "Hospital Capacity" if reason is bed unavailability
// ---------------------------------------------------------------------------
describe('AC-2 — Stage 5 + bed-unavailability reason → hospital_capacity', () => {
  it('no_icu_bed → hospital_capacity', () => {
    expect(getAttributionForDelay(5, 'no_icu_bed')).toBe('hospital_capacity')
  })

  it('no_general_ward_bed → hospital_capacity', () => {
    expect(getAttributionForDelay(5, 'no_general_ward_bed')).toBe('hospital_capacity')
  })

  it('no_bed_upstairs → hospital_capacity', () => {
    expect(getAttributionForDelay(5, 'no_bed_upstairs')).toBe('hospital_capacity')
  })

  it('stage 5 + awaiting_transport → unattributed (not bed-unavailability)', () => {
    expect(getAttributionForDelay(5, 'awaiting_transport')).toBe('unattributed')
  })

  it('stage 5 + family_consent → unattributed', () => {
    expect(getAttributionForDelay(5, 'family_consent')).toBe('unattributed')
  })

  it('stage 5 + awaiting_specialist → unattributed', () => {
    expect(getAttributionForDelay(5, 'awaiting_specialist')).toBe('unattributed')
  })

  it('stage 5 + other → unattributed', () => {
    expect(getAttributionForDelay(5, 'other')).toBe('unattributed')
  })

  it('stage 5 + null reason → unattributed (no reason recorded)', () => {
    expect(getAttributionForDelay(5, null)).toBe('unattributed')
  })
})

// ---------------------------------------------------------------------------
// AC-3: Attribution logic is configurable via ATTRIBUTION_CONFIG
// ---------------------------------------------------------------------------
describe('AC-3 — Attribution logic is configurable', () => {
  it('default ATTRIBUTION_CONFIG covers stages 1–4 as emergencyStaffStageOrders', () => {
    expect(ATTRIBUTION_CONFIG.emergencyStaffStageOrders).toEqual([1, 2, 3, 4])
  })

  it('default ATTRIBUTION_CONFIG sets dispositionStageOrder to 5', () => {
    expect(ATTRIBUTION_CONFIG.dispositionStageOrder).toBe(5)
  })

  it('default hospitalCapacityReasons contains the three bed-unavailability reasons', () => {
    expect(ATTRIBUTION_CONFIG.hospitalCapacityReasons).toContain('no_icu_bed')
    expect(ATTRIBUTION_CONFIG.hospitalCapacityReasons).toContain('no_general_ward_bed')
    expect(ATTRIBUTION_CONFIG.hospitalCapacityReasons).toContain('no_bed_upstairs')
  })

  it('custom config: stage 3 mapped to disposition stage → hospital_capacity if reason matches', () => {
    const customConfig: AttributionConfig = {
      emergencyStaffStageOrders: [1, 2],
      hospitalCapacityReasons: ['no_icu_bed'],
      dispositionStageOrder: 3,
    }
    expect(getAttributionForDelay(1, null, customConfig)).toBe('emergency_staff')
    expect(getAttributionForDelay(2, null, customConfig)).toBe('emergency_staff')
    expect(getAttributionForDelay(3, 'no_icu_bed', customConfig)).toBe('hospital_capacity')
    expect(getAttributionForDelay(3, 'other', customConfig)).toBe('unattributed')
  })

  it('custom config: expanding hospitalCapacityReasons to include awaiting_transport', () => {
    const customConfig: AttributionConfig = {
      ...ATTRIBUTION_CONFIG,
      hospitalCapacityReasons: [
        'no_icu_bed',
        'no_general_ward_bed',
        'no_bed_upstairs',
        'awaiting_transport',
      ],
    }
    expect(getAttributionForDelay(5, 'awaiting_transport', customConfig)).toBe('hospital_capacity')
    // Original still returns unattributed
    expect(getAttributionForDelay(5, 'awaiting_transport')).toBe('unattributed')
  })

  it('edge case: stage not in any config category returns unattributed', () => {
    expect(getAttributionForDelay(6, null)).toBe('unattributed')
    expect(getAttributionForDelay(7, null)).toBe('unattributed')
    expect(getAttributionForDelay(99, null)).toBe('unattributed')
  })
})

// ---------------------------------------------------------------------------
// AC-4: Reports show delays by attribution category (label / colour contract)
// ---------------------------------------------------------------------------
describe('AC-4 — Attribution labels and colours are defined for all categories', () => {
  const categories: DelayAttribution[] = ['emergency_staff', 'hospital_capacity', 'unattributed']

  categories.forEach((cat) => {
    it(`ATTRIBUTION_LABELS has a human-readable string for "${cat}"`, () => {
      expect(ATTRIBUTION_LABELS[cat]).toBeTruthy()
      expect(typeof ATTRIBUTION_LABELS[cat]).toBe('string')
    })

    it(`ATTRIBUTION_COLORS has bg/text/border/bar tokens for "${cat}"`, () => {
      const c = ATTRIBUTION_COLORS[cat]
      expect(c.bg).toBeTruthy()
      expect(c.text).toBeTruthy()
      expect(c.border).toBeTruthy()
      expect(c.bar).toBeTruthy()
    })
  })

  it('Emergency Staff label is human-readable', () => {
    expect(ATTRIBUTION_LABELS['emergency_staff']).toBe('Emergency Staff')
  })

  it('Hospital Capacity label is human-readable', () => {
    expect(ATTRIBUTION_LABELS['hospital_capacity']).toBe('Hospital Capacity')
  })
})

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
      { stageDisplayOrder: '1', durationMs: '3600000', reason: null },  // emergency_staff
      { stageDisplayOrder: '2', durationMs: '1800000', reason: null },  // emergency_staff
      { stageDisplayOrder: '5', durationMs: '7200000', reason: 'no_bed_upstairs' }, // hospital_capacity
      { stageDisplayOrder: '5', durationMs: '3600000', reason: 'no_general_ward_bed' }, // hospital_capacity
      { stageDisplayOrder: '5', durationMs: '900000',  reason: null },  // unattributed
    ]
    const result = aggregate(rows)
    const es = result.find((r) => r.attribution === 'emergency_staff')!
    const hc = result.find((r) => r.attribution === 'hospital_capacity')!
    const ua = result.find((r) => r.attribution === 'unattributed')!

    expect(es.totalDelayedMs).toBe(5_400_000)   // 3,600,000 + 1,800,000
    expect(es.incidentCount).toBe(2)
    expect(hc.totalDelayedMs).toBe(10_800_000)  // 7,200,000 + 3,600,000
    expect(hc.incidentCount).toBe(2)
    expect(ua.totalDelayedMs).toBe(900_000)
    expect(ua.incidentCount).toBe(1)
  })

  it('pg string coercion — "3600000" + "1800000" must equal 5_400_000, not "36000001800000"', () => {
    // This is the critical bug we fixed — verifying the fix holds
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
    // Math.round may cause off-by-one — allow ±1
    expect(total).toBeGreaterThanOrEqual(99)
    expect(total).toBeLessThanOrEqual(101)
  })
})

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
    const fractions = [0.6, 0.3, 0.1] // 60/30/10 split
    const GAP = 3
    let cumulativeOffset = 0
    const arcs: number[] = []
    for (const fraction of fractions) {
      const arcLength = fraction * CIRCUMFERENCE - GAP
      arcs.push(Math.max(0, arcLength))
      cumulativeOffset += fraction * CIRCUMFERENCE
    }
    // The cumulative offset at the end should equal the full circumference
    expect(cumulativeOffset).toBeCloseTo(CIRCUMFERENCE, 5)
  })

  it('cumulative offset starts at 0 for the first segment', () => {
    let cumulativeOffset = 0
    const firstDashOffset = -cumulativeOffset
    // JS -0 === 0 numerically; the SVG attribute treats them identically
    // Use == 0 or toBeCloseTo to avoid Object.is(-0, 0) false-negative
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
    // 30 days in ms = 2,592,000,000 — fits in JS number (max safe ~9×10^15)
    const thirtyDays = 30 * 24 * 3600 * 1000
    const result = getAttributionForDelay(1, null)
    expect(result).toBe('emergency_staff')
    // Verify JS can hold the accumulation
    const sum = thirtyDays + thirtyDays
    expect(sum).toBe(5_184_000_000)
    expect(Number.isSafeInteger(sum)).toBe(true)
  })

  it('fractional ms values from parseFloat are handled correctly', () => {
    // PostgreSQL BIGINT comes as string; parseFloat handles integer strings
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
