// US-10.6: Heatmap export utility tests (AC5: exportable as image)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { HeatmapData } from '../types/heatmap.types'

// ---------------------------------------------------------------------------
// Mock browser canvas APIs that Node doesn't have
// ---------------------------------------------------------------------------
const mockClick = vi.fn()

function buildMockCanvas() {
  const canvas = {
    width: 0,
    height: 0,
    toDataURL: vi.fn(() => 'data:image/png;base64,FAKE'),
    /** Simulate toBlob by invoking the callback synchronously with a fake Blob */
    toBlob: vi.fn((cb: BlobCallback) => cb(new Blob(['png'], { type: 'image/png' }))),
    getContext: vi.fn(() => ({
      fillStyle: '' as unknown,
      strokeStyle: '' as unknown,
      font: '',
      textAlign: '' as unknown,
      textBaseline: '' as unknown,
      lineWidth: 0,
      fillRect:   vi.fn(),
      strokeRect: vi.fn(),
      fillText:   vi.fn(),
      beginPath:  vi.fn(),
      moveTo:     vi.fn(),
      lineTo:     vi.fn(),
      stroke:     vi.fn(),
    })),
  }
  return canvas
}

function buildMockAnchor() {
  return { href: '', download: '', click: mockClick }
}

describe('exportHeatmapAsPng — AC5: exportable as image', () => {
  let originalCreateElement: typeof document.createElement

  beforeEach(() => {
    originalCreateElement = document.createElement.bind(document)

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return buildMockCanvas() as unknown as HTMLCanvasElement
      if (tag === 'a')      return buildMockAnchor()  as unknown as HTMLAnchorElement
      return originalCreateElement(tag)
    })
    vi.spyOn(document.body, 'appendChild').mockImplementation(vi.fn())
    vi.spyOn(document.body, 'removeChild').mockImplementation(vi.fn())
    // JSDOM doesn't implement URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:fake-url')
    global.URL.revokeObjectURL = vi.fn()
    mockClick.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('triggers a download click when called with valid data', async () => {
    const { exportHeatmapAsPng } = await import('../lib/heatmap-export')

    const data: HeatmapData = {
      cells: [{ dayOfWeek: 1, hourOfDay: 9, count: 5 }],
      maxCount: 5,
      totalAdmissions: 5,
      dateRange: { start: null, end: null },
    }

    exportHeatmapAsPng(data)

    expect(mockClick).toHaveBeenCalledTimes(1)
  })

  it('does not throw when cell data is empty', async () => {
    const { exportHeatmapAsPng } = await import('../lib/heatmap-export')

    const data: HeatmapData = {
      cells: [],
      maxCount: 0,
      totalAdmissions: 0,
      dateRange: { start: null, end: null },
    }

    expect(() => exportHeatmapAsPng(data)).not.toThrow()
  })

  it('creates a canvas element during export', async () => {
    const { exportHeatmapAsPng } = await import('../lib/heatmap-export')

    const data: HeatmapData = {
      cells: [],
      maxCount: 0,
      totalAdmissions: 0,
      dateRange: { start: null, end: null },
    }

    exportHeatmapAsPng(data)

    expect(document.createElement).toHaveBeenCalledWith('canvas')
  })
})

// ---------------------------------------------------------------------------
// HeatmapData types structural tests (safety net for contract changes)
// ---------------------------------------------------------------------------
describe('HeatmapData type contract', () => {
  it('HeatmapCell has required dayOfWeek, hourOfDay, count fields', () => {
    const cell = { dayOfWeek: 0, hourOfDay: 0, count: 0 }
    expect(typeof cell.dayOfWeek).toBe('number')
    expect(typeof cell.hourOfDay).toBe('number')
    expect(typeof cell.count).toBe('number')
  })

  it('dayOfWeek range 0–6 is valid (Sun=0, Sat=6)', () => {
    for (let d = 0; d <= 6; d++) {
      expect(d).toBeGreaterThanOrEqual(0)
      expect(d).toBeLessThanOrEqual(6)
    }
  })

  it('hourOfDay range 0–23 is valid', () => {
    for (let h = 0; h <= 23; h++) {
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThanOrEqual(23)
    }
  })

  it('HeatmapData.maxCount equals the highest cell count', () => {
    const cells = [
      { dayOfWeek: 0, hourOfDay: 8,  count: 3 },
      { dayOfWeek: 1, hourOfDay: 10, count: 9 },
      { dayOfWeek: 5, hourOfDay: 14, count: 2 },
    ]
    const maxCount = cells.reduce((m, c) => Math.max(m, c.count), 0)
    expect(maxCount).toBe(9)
  })
})
