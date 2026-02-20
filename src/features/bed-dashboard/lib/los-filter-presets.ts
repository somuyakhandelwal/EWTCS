// los-filter-presets — Shift presets and date helpers for LosFilterBar
// EPIC 10: Management Report Dashboard

import type { LosFilters } from '../lib/los-queries'

export type ShiftPreset = {
  label: string
  start: string
  end: string
  crossesMidnight: boolean
}

export const SHIFT_PRESETS: ShiftPreset[] = [
  { label: 'Morning (08:00–16:00)', start: '08:00:00', end: '16:00:00', crossesMidnight: false },
  { label: 'Evening (16:00–22:00)', start: '16:00:00', end: '22:00:00', crossesMidnight: false },
  { label: 'Night (22:00–08:00)',   start: '22:00:00', end: '08:00:00', crossesMidnight: true  },
]

export const DATE_RANGE_PRESETS = [
  { label: 'Today',   days: 0 },
  { label: '7 days',  days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
]

/** Format a Date to YYYY-MM-DD for input[type=date] */
export function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function makeDatePreset(daysPast: number): Pick<LosFilters, 'startDate' | 'endDate'> {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - daysPast)
  return { startDate: start, endDate: end }
}
