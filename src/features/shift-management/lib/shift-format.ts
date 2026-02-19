// Shift format helpers — pure functions, safe to import from client components
// No database dependency.

/**
 * Format a shift's time range as a human-readable string.
 * Accepts "HH:MM" or "HH:MM:SS".  e.g. "06:00 – 14:00"
 */
export function formatShiftTime(start: string, end: string): string {
  const fmt = (t: string) => t.slice(0, 5) // "HH:MM"
  return `${fmt(start)} – ${fmt(end)}`
}
