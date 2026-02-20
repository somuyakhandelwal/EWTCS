// los-chart-compute — Pure computation helpers for LosTrendChart SVG rendering
// EPIC 10: Management Report Dashboard

import type { LosTrendPoint } from './los-queries'

export const CHART_HEIGHT = 200   // px — SVG viewport height (data area only)
export const CHART_PADDING = { top: 12, right: 16, bottom: 32, left: 64 }
const TOTAL_WIDTH = 600           // SVG internal coordinate width

export interface ChartComputed {
  toX: (i: number) => number
  toY: (ms: number) => number
  linePoints: string
  ticks: Array<{ ms: number; y: number }>
  totalWidth: number
}

/**
 * Format an ISO date string (YYYY-MM-DD) to a short label e.g. "Feb 18"
 */
export function formatDateLabel(isoDate: string): string {
  try {
    const d = new Date(isoDate + 'T00:00:00')
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  } catch {
    return isoDate
  }
}

/**
 * Derive all SVG coordinates and helpers from the raw trend data.
 * Returns null when trend is empty.
 */
export function computeChartData(
  trend: LosTrendPoint[],
  targetLosMs: number | null,
): ChartComputed | null {
  if (trend.length === 0) return null

  const values = trend.map((p) => p.averageLosMs)
  const allValues = targetLosMs !== null ? [...values, targetLosMs] : values

  const maxMs = Math.max(...allValues) * 1.1
  const minMs = Math.max(0, Math.min(...allValues) * 0.9)
  const rangeMs = maxMs - minMs || 1

  const dataWidth = TOTAL_WIDTH - CHART_PADDING.left - CHART_PADDING.right
  const dataHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom

  const toY = (ms: number) =>
    CHART_PADDING.top + dataHeight - ((ms - minMs) / rangeMs) * dataHeight

  const toX = (i: number) =>
    CHART_PADDING.left +
    (trend.length === 1 ? dataWidth / 2 : (i / (trend.length - 1)) * dataWidth)

  const linePoints = trend
    .map((p, i) => `${toX(i)},${toY(p.averageLosMs)}`)
    .join(' ')

  const ticks = [0, 0.33, 0.67, 1].map((f) => ({
    ms: minMs + f * rangeMs,
    y: CHART_PADDING.top + dataHeight - f * dataHeight,
  }))

  return { toX, toY, linePoints, ticks, totalWidth: TOTAL_WIDTH }
}
