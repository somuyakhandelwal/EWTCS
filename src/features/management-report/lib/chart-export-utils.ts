'use client'
// chart-export-utils — PNG export helper for management-report charts.
// Uses html2canvas (already bundled) to rasterise a DOM element.
// Epic 10: Management Report Dashboard (US-10.7 / #66)

/**
 * Capture the element with the given ID as a PNG and trigger a download.
 * Dynamic import keeps html2canvas out of the server bundle.
 */
export async function exportChartAsPng(
  elementId: string,
  filename: string
): Promise<void> {
  const el = document.getElementById(elementId)
  if (!el) {
    // Element not mounted yet — silently abort; no action needed by caller
    return
  }

  // Dynamic import — avoids SSR issues
  const { default: html2canvas } = await import('html2canvas')

  const canvas = await html2canvas(el, {
    backgroundColor: '#18181b',
    scale: 2,
    useCORS: true,
    logging: false,
  })

  const link = document.createElement('a')
  link.download = `${filename}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}
