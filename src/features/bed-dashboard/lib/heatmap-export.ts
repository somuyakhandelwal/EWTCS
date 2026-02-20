// Staffing Heatmap PNG Export Utility
// EPIC 10: Management Report Dashboard
// Renders heatmap data to an offscreen Canvas and triggers a browser PNG download.
// No external libraries required — uses the native Canvas 2D API.

import type { HeatmapData } from '../types/heatmap.types'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const CELL    = 28   // px per cell
const LABEL_W = 36   // left-hand day-label column width
const LABEL_H = 18   // top hour-label row height
const PAD     = 14   // canvas padding

/** Maps a 0–1 intensity value to an rgba colour consistent with the UI. */
function cellColor(intensity: number): string {
  if (intensity === 0) return '#18181b' // zinc-900
  const alpha = Math.round((0.15 + intensity * 0.85) * 100) / 100
  return `rgba(59,130,246,${alpha})`     // blue-500 family
}

/**
 * Draws the heatmap onto an offscreen <canvas> and downloads it as a PNG.
 * Safe to call only in browser context (uses document / canvas APIs).
 */
export function exportHeatmapAsPng(data: HeatmapData): void {
  const cols = 24
  const rows = 7

  const W = PAD + LABEL_W + cols * CELL + PAD
  const H = PAD + LABEL_H + rows * CELL + PAD + 20   // +20 for footer

  const canvas = document.createElement('canvas')
  canvas.width  = W
  canvas.height = H

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // ── Background ──────────────────────────────────────────────────────────────
  ctx.fillStyle = '#09090b'
  ctx.fillRect(0, 0, W, H)

  ctx.font      = '10px system-ui, sans-serif'
  ctx.textBaseline = 'middle'

  // ── Hour labels (every 3 h) ──────────────────────────────────────────────────
  ctx.fillStyle = '#71717a'
  for (let h = 0; h < 24; h++) {
    if (h % 3 === 0) {
      const x = PAD + LABEL_W + h * CELL + 2
      ctx.fillText(String(h).padStart(2, '0'), x, PAD + LABEL_H / 2)
    }
  }

  // ── Rows ─────────────────────────────────────────────────────────────────────
  for (let dow = 0; dow < 7; dow++) {
    const rowY = PAD + LABEL_H + dow * CELL

    // Day label
    ctx.fillStyle = '#a1a1aa'
    ctx.fillText(DAY_LABELS[dow], PAD, rowY + CELL / 2)

    for (let hour = 0; hour < 24; hour++) {
      const cell      = data.cells.find(c => c.dayOfWeek === dow && c.hourOfDay === hour)
      const count     = cell?.count ?? 0
      const intensity = data.maxCount > 0 ? count / data.maxCount : 0
      const cellX     = PAD + LABEL_W + hour * CELL

      ctx.fillStyle = cellColor(intensity)
      ctx.fillRect(cellX + 1, rowY + 1, CELL - 2, CELL - 2)

      if (count > 0) {
        ctx.fillStyle = '#ffffff'
        ctx.fillText(String(count), cellX + 4, rowY + CELL / 2)
      }
    }
  }

  // ── Footer watermark ─────────────────────────────────────────────────────────
  ctx.font      = '9px system-ui, sans-serif'
  ctx.fillStyle = '#52525b'
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  ctx.fillText(`EWTCS Staffing Heatmap — ${dateStr} — ${data.totalAdmissions} admissions`, PAD, H - 7)

  // ── Download ─────────────────────────────────────────────────────────────────
  canvas.toBlob(blob => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a   = document.createElement('a')
    a.href     = url
    a.download = `staffing-heatmap-${new Date().toISOString().split('T')[0]}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  })
}
