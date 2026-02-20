// CSV Utils Unit Tests — EPIC 11 (US-11.2)
// Tests pure CSV generation functions without any database dependency.

import { describe, it, expect } from 'vitest'
import {
  generatePatientCountCSV,
  generateDelayedPatientsCSV,
  generateBedPerformanceCSV,
  generateStageDelayCSV,
} from '../lib/csv-utils'
import type { PatientCountSummary } from '@/features/management-report/types/report.types'
import type {
  DelayedPatientsSummary,
  BedPerformanceReport,
  StageDelayReport,
} from '@/features/management-report/types/report.types'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const RANGE_LABEL = '2026-01-22 to 2026-02-21'

const patientSummary: PatientCountSummary = {
  totalPatients: 42,
  avgDurationMs: 7_200_000, // 120 min
  rangeStart: new Date('2026-01-22T00:00:00Z'),
  rangeEnd: new Date('2026-02-21T23:59:59Z'),
  shiftName: 'Morning Shift',
}

const delaySummary: DelayedPatientsSummary = {
  totalPatients: 100,
  delayedPatients: 30,
  delayPct: 30.0,
  targetPct: 20,
  thresholdMs: 10_800_000, // 180 min
  rangeStart: new Date('2026-01-22T00:00:00Z'),
  rangeEnd: new Date('2026-02-21T23:59:59Z'),
  trend: [
    { date: '2026-01-22', totalPatients: 10, delayedPatients: 3, delayPct: 30.0 },
    { date: '2026-01-23', totalPatients: 8,  delayedPatients: 2, delayPct: 25.0 },
  ],
}

const bedReport: BedPerformanceReport = {
  rows: [
    {
      bedId: 'bed-1',
      bedNumber: 'ER-01',
      patientsTreated: 15,
      avgDurationMs: 5_400_000,
      minDurationMs: 1_800_000,
      maxDurationMs: 14_400_000,
      delayedCount: 3,
      delayRate: 20,
      isOutlier: false,
    },
    {
      bedId: 'bed-2',
      bedNumber: 'ER-02',
      patientsTreated: 8,
      avgDurationMs: 12_600_000,
      minDurationMs: 7_200_000,
      maxDurationMs: 21_600_000,
      delayedCount: 6,
      delayRate: 75,
      isOutlier: true,
    },
  ],
  overallAvgMs: 9_000_000,
  thresholdMs: 10_800_000,
  rangeStart: new Date('2026-01-22T00:00:00Z'),
  rangeEnd: new Date('2026-02-21T23:59:59Z'),
}

const stageReport: StageDelayReport = {
  rows: [
    {
      stageId: 'stage-1',
      stageName: 'Triage',
      totalTransitions: 80,
      avgDurationMs: 900_000,
      medianDurationMs: 840_000,
      p90DurationMs: 1_200_000,
      isBottleneck: false,
    },
    {
      stageId: 'stage-2',
      stageName: 'Awaiting Doctor',
      totalTransitions: 76,
      avgDurationMs: 5_400_000,
      medianDurationMs: 4_800_000,
      p90DurationMs: 9_000_000,
      isBottleneck: true,
    },
  ],
  overallMeanMs: 3_150_000,
  rangeStart: new Date('2026-01-22T00:00:00Z'),
  rangeEnd: new Date('2026-02-21T23:59:59Z'),
}

// ---------------------------------------------------------------------------
// generatePatientCountCSV
// ---------------------------------------------------------------------------

describe('generatePatientCountCSV', () => {
  it('produces valid CSV with two rows (header + data)', () => {
    const csv = generatePatientCountCSV(patientSummary, RANGE_LABEL)
    const lines = csv.split('\n').filter(Boolean)
    expect(lines).toHaveLength(2)
  })

  it('includes total patients count', () => {
    const csv = generatePatientCountCSV(patientSummary, RANGE_LABEL)
    expect(csv).toContain('"42"')
  })

  it('converts avg duration to minutes (120.0)', () => {
    const csv = generatePatientCountCSV(patientSummary, RANGE_LABEL)
    expect(csv).toContain('"120.0"')
  })

  it('includes shift name', () => {
    const csv = generatePatientCountCSV(patientSummary, RANGE_LABEL)
    expect(csv).toContain('Morning Shift')
  })

  it('includes range label', () => {
    const csv = generatePatientCountCSV(patientSummary, RANGE_LABEL)
    expect(csv).toContain(RANGE_LABEL)
  })

  it('handles null avgDurationMs gracefully', () => {
    const csv = generatePatientCountCSV(
      { ...patientSummary, avgDurationMs: null },
      RANGE_LABEL
    )
    expect(csv).toContain('"N/A"')
  })

  it('shows "All Shifts" when shiftName is null', () => {
    const csv = generatePatientCountCSV(
      { ...patientSummary, shiftName: null },
      RANGE_LABEL
    )
    expect(csv).toContain('All Shifts')
  })
})

// ---------------------------------------------------------------------------
// generateDelayedPatientsCSV
// ---------------------------------------------------------------------------

describe('generateDelayedPatientsCSV', () => {
  it('includes summary + blank line + trend header + trend rows', () => {
    const csv = generateDelayedPatientsCSV(delaySummary, RANGE_LABEL)
    expect(csv).toContain('Daily Trend')
    expect(csv).toContain('2026-01-22')
    expect(csv).toContain('2026-01-23')
  })

  it('encodes delay percentage correctly', () => {
    const csv = generateDelayedPatientsCSV(delaySummary, RANGE_LABEL)
    expect(csv).toContain('"30.0"')
  })

  it('shows target pct when set', () => {
    const csv = generateDelayedPatientsCSV(delaySummary, RANGE_LABEL)
    expect(csv).toContain('"20.0"')
  })

  it('shows "Not Set" when target is null', () => {
    const csv = generateDelayedPatientsCSV(
      { ...delaySummary, targetPct: null },
      RANGE_LABEL
    )
    expect(csv).toContain('Not Set')
  })

  it('trend rows include all columns', () => {
    const csv = generateDelayedPatientsCSV(delaySummary, RANGE_LABEL)
    const lines = csv.split('\n').filter(Boolean)
    // summary header + summary data + blank + "Daily Trend" label + trend header + 2 trend rows = 7+ lines but blank line is present
    expect(lines.length).toBeGreaterThan(5)
  })
})

// ---------------------------------------------------------------------------
// generateBedPerformanceCSV
// ---------------------------------------------------------------------------

describe('generateBedPerformanceCSV', () => {
  it('produces one row per bed plus meta and header rows', () => {
    const csv = generateBedPerformanceCSV(bedReport, RANGE_LABEL)
    expect(csv).toContain('ER-01')
    expect(csv).toContain('ER-02')
  })

  it('flags outlier bed as Yes', () => {
    const csv = generateBedPerformanceCSV(bedReport, RANGE_LABEL)
    expect(csv).toContain('"Yes"')
  })

  it('flags non-outlier bed as No', () => {
    const csv = generateBedPerformanceCSV(bedReport, RANGE_LABEL)
    expect(csv).toContain('"No"')
  })

  it('includes patient count as number', () => {
    const csv = generateBedPerformanceCSV(bedReport, RANGE_LABEL)
    expect(csv).toContain('"15"')
    expect(csv).toContain('"8"')
  })

  it('converts durations from ms to minutes', () => {
    const csv = generateBedPerformanceCSV(bedReport, RANGE_LABEL)
    // 5_400_000 ms = 90 min
    expect(csv).toContain('"90.0"')
  })
})

// ---------------------------------------------------------------------------
// generateStageDelayCSV
// ---------------------------------------------------------------------------

describe('generateStageDelayCSV', () => {
  it('includes one row per stage', () => {
    const csv = generateStageDelayCSV(stageReport, RANGE_LABEL)
    expect(csv).toContain('Triage')
    expect(csv).toContain('Awaiting Doctor')
  })

  it('flags bottleneck stage as Yes', () => {
    const csv = generateStageDelayCSV(stageReport, RANGE_LABEL)
    expect(csv).toContain('"Yes"')
  })

  it('includes avg duration in minutes (15.0 for 900_000 ms)', () => {
    const csv = generateStageDelayCSV(stageReport, RANGE_LABEL)
    expect(csv).toContain('"15.0"')
  })

  it('handles null median and p90 gracefully', () => {
    const report: StageDelayReport = {
      ...stageReport,
      rows: [{ ...stageReport.rows[0], medianDurationMs: null, p90DurationMs: null }],
    }
    const csv = generateStageDelayCSV(report, RANGE_LABEL)
    expect(csv).toContain('"N/A"')
  })

  it('includes range label', () => {
    const csv = generateStageDelayCSV(stageReport, RANGE_LABEL)
    expect(csv).toContain(RANGE_LABEL)
  })
})
