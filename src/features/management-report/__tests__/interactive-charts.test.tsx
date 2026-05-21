// interactive-charts.test.tsx — US-10.7 / #66 (Interactive Charts)
// Tests: BedPerformanceChart, StageDelayBarChart, DelayedPatientTrendCard

import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

// --- recharts: render children only, skip SVG internals ---
vi.mock('recharts', () => {
  const noop = () => null
  const passthrough = (props: { children?: React.ReactNode }) =>
    props.children as React.ReactElement ?? null
  return {
    ResponsiveContainer: passthrough,
    BarChart: passthrough,
    ComposedChart: passthrough,
    Bar: noop,
    XAxis: noop,
    YAxis: noop,
    CartesianGrid: noop,
    Tooltip: noop,
    Brush: noop,
    Cell: noop,
    Area: noop,
    ReferenceLine: noop,
  }
})

vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({ toDataURL: () => 'data:image/png;base64,abc' }),
}))

vi.mock('@/features/bed-dashboard/lib/duration-formatters', () => ({
  formatDuration: (ms: number) => `${Math.round(ms / 60000)}m`,
}))

vi.mock('../lib/chart-export-utils', () => ({
  exportChartAsPng: vi.fn(),
}))

import { BedPerformanceChart } from '../components/BedPerformanceChart'
import { StageDelayBarChart } from '../components/StageDelayBarChart'
import { DelayedPatientTrendCard } from '../components/DelayedPatientTrendCard'
import { exportChartAsPng } from '../lib/chart-export-utils'
import type { BedPerformanceRow, StageDelayRow, DelayTrendPoint } from '../types/report.types'

// ---- Fixtures ----
const BEDS: BedPerformanceRow[] = [
  {
    bedId: 'b1', bedNumber: 'ER-01', patientsTreated: 10,
    avgDurationMs: 7_200_000, minDurationMs: 1_800_000, maxDurationMs: 14_400_000,
    delayedCount: 1, delayRate: 10, isOutlier: false,
  },
  {
    bedId: 'b2', bedNumber: 'ER-02', patientsTreated: 5,
    avgDurationMs: 18_000_000, minDurationMs: 10_800_000, maxDurationMs: 36_000_000,
    delayedCount: 4, delayRate: 80, isOutlier: true,
  },
]

const STAGES: StageDelayRow[] = [
  { stageId: 's1', stageName: 'Initial Investigation', totalTransitions: 20, avgDurationMs: 1_200_000, medianDurationMs: 900_000, p90DurationMs: 2_400_000, isBottleneck: false },
  { stageId: 's2', stageName: 'Treatment', totalTransitions: 18, avgDurationMs: 9_000_000, medianDurationMs: 7_200_000, p90DurationMs: 18_000_000, isBottleneck: true },
]

const TREND: DelayTrendPoint[] = [
  { date: '2026-02-15', totalPatients: 20, delayedPatients: 4, delayPct: 20 },
  { date: '2026-02-16', totalPatients: 22, delayedPatients: 6, delayPct: 27.3 },
  { date: '2026-02-17', totalPatients: 18, delayedPatients: 2, delayPct: 11.1 },
]

// ---- BedPerformanceChart ----
describe('BedPerformanceChart', () => {
  it('renders Export PNG button', () => {
    render(<BedPerformanceChart rows={BEDS} />)
    expect(screen.getByText(/export png/i)).toBeTruthy()
  })

  it('renders Outliers only toggle button', () => {
    render(<BedPerformanceChart rows={BEDS} />)
    expect(screen.getByText(/outliers only/i)).toBeTruthy()
  })

  it('shows empty state when no patients treated', () => {
    const empty = BEDS.map((b) => ({ ...b, patientsTreated: 0 }))
    render(<BedPerformanceChart rows={empty} />)
    expect(screen.getByText(/no data for selected period/i)).toBeTruthy()
  })

  it('shows no-outlier message when filter active and no outliers exist', () => {
    const noOutliers = BEDS.map((b) => ({ ...b, isOutlier: false }))
    render(<BedPerformanceChart rows={noOutliers} />)
    fireEvent.click(screen.getByText(/outliers only/i))
    expect(screen.getByText(/no outlier beds in this period/i)).toBeTruthy()
  })

  it('calls exportChartAsPng with correct filename on PNG export click', () => {
    render(<BedPerformanceChart rows={BEDS} />)
    fireEvent.click(screen.getByText(/export png/i))
    expect(exportChartAsPng).toHaveBeenCalledWith(
      expect.any(String),
      'bed-performance',
    )
  })
})

// ---- StageDelayBarChart ----
describe('StageDelayBarChart', () => {
  it('renders Export PNG button', () => {
    render(<StageDelayBarChart rows={STAGES} />)
    expect(screen.getByText(/export png/i)).toBeTruthy()
  })

  it('shows empty state when all stages have zero transitions', () => {
    const empty = STAGES.map((s) => ({ ...s, totalTransitions: 0 }))
    render(<StageDelayBarChart rows={empty} />)
    expect(screen.getByText(/no transition data for selected period/i)).toBeTruthy()
  })

  it('calls exportChartAsPng with correct filename on PNG export click', () => {
    render(<StageDelayBarChart rows={STAGES} />)
    fireEvent.click(screen.getByText(/export png/i))
    expect(exportChartAsPng).toHaveBeenCalledWith(
      expect.any(String),
      'stage-delays',
    )
  })
})

// ---- DelayedPatientTrendCard ----
describe('DelayedPatientTrendCard', () => {
  it('shows loading skeleton when loading=true', () => {
    const { container } = render(
      <DelayedPatientTrendCard trend={[]} targetPct={null} loading={true} />,
    )
    expect(container.querySelector('.animate-pulse')).toBeTruthy()
  })

  it('hides Export PNG button while loading', () => {
    render(<DelayedPatientTrendCard trend={TREND} targetPct={null} loading={true} />)
    expect(screen.queryByText(/export png/i)).toBeNull()
  })

  it('shows empty state when no trend data and not loading', () => {
    render(<DelayedPatientTrendCard trend={[]} targetPct={null} loading={false} />)
    expect(screen.getByText(/not enough data for trend/i)).toBeTruthy()
  })

  it('renders Daily Trend heading when data is present', () => {
    render(<DelayedPatientTrendCard trend={TREND} targetPct={null} loading={false} />)
    expect(screen.getByText(/daily trend/i)).toBeTruthy()
  })

  it('shows target pct in card description when set', () => {
    render(<DelayedPatientTrendCard trend={TREND} targetPct={25} loading={false} />)
    expect(screen.getByText(/target.*25%/i)).toBeTruthy()
  })

  it('renders Export PNG button when data present', () => {
    render(<DelayedPatientTrendCard trend={TREND} targetPct={null} loading={false} />)
    expect(screen.getByText(/export png/i)).toBeTruthy()
  })

  it('calls exportChartAsPng with correct filename on PNG export click', () => {
    render(<DelayedPatientTrendCard trend={TREND} targetPct={null} loading={false} />)
    fireEvent.click(screen.getByText(/export png/i))
    expect(exportChartAsPng).toHaveBeenCalledWith(
      expect.any(String),
      'delay-trend',
    )
  })
})
