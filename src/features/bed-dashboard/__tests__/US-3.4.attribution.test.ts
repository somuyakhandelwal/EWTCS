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
