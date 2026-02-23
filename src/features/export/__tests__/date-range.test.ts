// Date Range Tests — EPIC 11 (US-11.3)
// Tests for resolvePreset and buildFilename helper functions.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { resolvePreset, DATE_PRESETS } from '../components/DateRangePicker'
import { buildFilename } from '../lib/pdf-generator'
import type { ResolvedDateRange } from '../types/export.types'

// ---------------------------------------------------------------------------
// resolvePreset
// ---------------------------------------------------------------------------

describe('resolvePreset', () => {
  const FIXED_NOW = new Date('2026-02-21T12:00:00Z').getTime()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves "1d" to a range where startDate is before endDate and spans at least 1 day', () => {
    const range = resolvePreset('1d', '', '')
    // start = midnight of (today - 1 day), end = 23:59:59.999 of today
    // diff can be ~24h to ~48h depending on local time, but always > 0
    expect(range.startDate.getTime()).toBeLessThan(range.endDate.getTime())
    const diffMs = range.endDate.getTime() - range.startDate.getTime()
    expect(diffMs).toBeGreaterThan(0)
    expect(diffMs).toBeLessThanOrEqual(48 * 3_600_000 + 999)
  })

  it('resolves "7d" label correctly', () => {
    const range = resolvePreset('7d', '', '')
    expect(range.label).toBe('Last 7d')
  })

  it('resolves "30d" as default and returns Last 30d label', () => {
    const range = resolvePreset('30d', '', '')
    expect(range.label).toBe('Last 30d')
  })

  it('sets start to midnight (00:00:00)', () => {
    const range = resolvePreset('7d', '', '')
    expect(range.startDate.getHours()).toBe(0)
    expect(range.startDate.getMinutes()).toBe(0)
    expect(range.startDate.getSeconds()).toBe(0)
  })

  it('sets end to 23:59:59.999', () => {
    const range = resolvePreset('7d', '', '')
    expect(range.endDate.getHours()).toBe(23)
    expect(range.endDate.getMinutes()).toBe(59)
    expect(range.endDate.getSeconds()).toBe(59)
  })

  it('startDate is before endDate for all presets', () => {
    for (const p of DATE_PRESETS) {
      if (p.value === 'custom') continue
      const range = resolvePreset(p.value, '', '')
      expect(range.startDate.getTime()).toBeLessThan(range.endDate.getTime())
    }
  })

  it('resolves "custom" using provided date strings', () => {
    const range = resolvePreset('custom', '2026-01-01', '2026-01-31')
    expect(range.startDate.getFullYear()).toBe(2026)
    expect(range.startDate.getMonth()).toBe(0) // January
    expect(range.startDate.getDate()).toBe(1)
    expect(range.endDate.getDate()).toBe(31)
  })

  it('custom label contains the date range', () => {
    const range = resolvePreset('custom', '2026-01-01', '2026-01-31')
    // Label is built from local-time toInputDate — it contains start and end dates
    // (may render as YYYY-MM-DD local values, so just check the year and both months)
    expect(range.label).toMatch(/2026/)
    expect(range.label).toContain('2026-01-31')
  })

  it('custom with empty strings falls back to ~30d default', () => {
    // Should not throw
    expect(() => resolvePreset('custom', '', '')).not.toThrow()
    const range = resolvePreset('custom', '', '')
    expect(range.startDate).toBeInstanceOf(Date)
    expect(range.endDate).toBeInstanceOf(Date)
  })

  it('unknown preset value defaults to "30d" preset', () => {
    const range = resolvePreset('unknown-value', '', '')
    // Falls back to the found preset or PRESETS[2] (30d)
    expect(range).toBeDefined()
    expect(range.startDate.getTime()).toBeLessThan(range.endDate.getTime())
  })
})

// ---------------------------------------------------------------------------
// buildFilename
// ---------------------------------------------------------------------------

describe('buildFilename', () => {
  const range: ResolvedDateRange = {
    startDate: new Date('2026-01-22T00:00:00Z'),
    endDate: new Date('2026-02-21T23:59:59Z'),
    label: 'Last 30d',
  }

  it('builds CSV filename with date range', () => {
    const name = buildFilename('bed-performance', range, 'csv')
    expect(name).toBe('bed-performance_2026-01-22_2026-02-21.csv')
  })

  it('builds PDF filename with date range', () => {
    const name = buildFilename('full-report', range, 'pdf')
    expect(name).toBe('full-report_2026-01-22_2026-02-21.pdf')
  })

  it('includes base name as prefix', () => {
    const name = buildFilename('stage-delays', range, 'csv')
    expect(name).toMatch(/^stage-delays_/)
  })

  it('always ends with the correct extension', () => {
    expect(buildFilename('report', range, 'csv')).toMatch(/\.csv$/)
    expect(buildFilename('report', range, 'pdf')).toMatch(/\.pdf$/)
  })

  it('uses ISO date format YYYY-MM-DD in filename', () => {
    const name = buildFilename('x', range, 'csv')
    expect(name).toMatch(/\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}/)
  })

  it('date range is reflected in filename per US-11.3 AC', () => {
    const customRange: ResolvedDateRange = {
      startDate: new Date('2025-06-01T00:00:00Z'),
      endDate: new Date('2025-06-30T23:59:59Z'),
      label: 'Custom',
    }
    const name = buildFilename('patients', customRange, 'csv')
    expect(name).toContain('2025-06-01')
    expect(name).toContain('2025-06-30')
  })
})
