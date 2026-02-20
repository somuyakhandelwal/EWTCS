// Duration Formatting Utilities — Shared
// Purpose: Convert milliseconds to human-readable durations
// Used by: bed-dashboard, management-report, shift-management

/**
 * Format milliseconds into human-readable duration
 * Examples: "2h 30m", "45m 22s", "15s"
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || ms < 0) return 'N/A'

  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

/**
 * Format duration in a more detailed way
 * Examples: "2 hours 30 minutes", "45 minutes 22 seconds"
 */
export function formatDurationDetailed(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || ms < 0) return 'N/A'

  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const parts: string[] = []
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`)
  if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`)
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} second${seconds > 1 ? 's' : ''}`)

  return parts.join(' ')
}

/**
 * Convert milliseconds to a specific unit
 */
export function convertDuration(
  ms: number,
  unit: 'seconds' | 'minutes' | 'hours' | 'days'
): number {
  const divisors = {
    seconds: 1000,
    minutes: 1000 * 60,
    hours: 1000 * 60 * 60,
    days: 1000 * 60 * 60 * 24,
  }
  return ms / divisors[unit]
}
