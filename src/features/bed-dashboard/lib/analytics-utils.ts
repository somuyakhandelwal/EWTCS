// Analytics Utilities
// Purpose: Helper functions for formatting and analyzing stage transition data
// Epic: EPIC 3 - Time Tracking & Stage Logging

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

/**
 * Calculate percentage of time in a stage vs total time
 */
export function calculateStagePercentage(stageDurationMs: number, totalDurationMs: number): number {
  if (totalDurationMs === 0) return 0
  return (stageDurationMs / totalDurationMs) * 100
}

/**
 * Determine if a duration is considered "delayed"
 * Threshold can be customized per stage
 */
export function isDelayed(
  durationMs: number,
  thresholdMs: number = 3600000 // 1 hour default
): boolean {
  return durationMs > thresholdMs
}

/**
 * Get a color class based on delay status
 */
export function getDelayColorClass(durationMs: number | null, thresholdMs: number = 3600000): string {
  if (!durationMs) return 'text-gray-500'
  if (isDelayed(durationMs, thresholdMs)) return 'text-red-600'
  if (durationMs > thresholdMs * 0.7) return 'text-yellow-600'
  return 'text-green-600'
}

/**
 * Group stage transitions by date
 */
export function groupByDate(
  transitions: Array<{ transitionTime: Date | string }>,
  dateFormat: 'date' | 'week' | 'month' = 'date'
): Map<string, Array<{ transitionTime: Date | string }>> {
  const grouped = new Map<string, Array<{ transitionTime: Date | string }>>()

  transitions.forEach((transition) => {
    const date = transition.transitionTime instanceof Date 
      ? transition.transitionTime 
      : new Date(transition.transitionTime)
    
    let key: string
    if (dateFormat === 'date') {
      key = date.toISOString().split('T')[0]
    } else if (dateFormat === 'week') {
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      key = weekStart.toISOString().split('T')[0]
    } else {
      key = date.toISOString().substring(0, 7)
    }

    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(transition)
  })

  return grouped
}

/**
 * Calculate average duration for a group of transitions
 */
export function calculateAverageDuration(
  transitions: Array<{ durationInPreviousStageMs: number | null }>
): number {
  const validDurations = transitions.filter((t) => t.durationInPreviousStageMs !== null)
  if (validDurations.length === 0) return 0
  
  const sum = validDurations.reduce((acc, t) => acc + (t.durationInPreviousStageMs || 0), 0)
  return sum / validDurations.length
}

/**
 * Generate CSV content from transition data
 */
export function generateTransitionCSV(
  transitions: Array<{
    id: string
    bedNumber: string
    fromStageName: string | null
    toStageName: string
    transitionTime: Date | string
    durationInPreviousStageMs: number | null
    durationInCurrentStageMs: number | null
    changedByUsername: string
    notes: string | null
  }>
): string {
  const headers = [
    'ID',
    'Bed Number',
    'From Stage',
    'To Stage',
    'Transition Time',
    'Duration in Previous Stage (ms)',
    'Duration in Current Stage (ms)',
    'Changed By',
    'Notes',
  ]

  const rows = transitions.map((t) => [
    t.id,
    t.bedNumber,
    t.fromStageName || 'N/A',
    t.toStageName,
    t.transitionTime instanceof Date ? t.transitionTime.toISOString() : t.transitionTime,
    t.durationInPreviousStageMs?.toString() || 'N/A',
    t.durationInCurrentStageMs?.toString() || 'N/A',
    t.changedByUsername,
    `"${t.notes || ''}"`,
  ])

  const csvRows = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(','))
  return csvRows.join('\n')
}

/**
 * Calculate percentile value
 */
export function calculatePercentile(values: number[], percentile: number): number | null {
  if (values.length === 0) return null
  
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil((percentile / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

/**
 * Detect anomalies in stage durations (outliers)
 */
export function detectAnomalies(
  durations: number[],
  stdDevMultiplier: number = 2
): { isAnomaly: boolean; threshold: number }[] {
  if (durations.length < 2) {
    return durations.map(() => ({ isAnomaly: false, threshold: Infinity }))
  }

  const mean = durations.reduce((a, b) => a + b, 0) / durations.length
  const variance = durations.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / durations.length
  const stdDev = Math.sqrt(variance)
  const threshold = mean + stdDev * stdDevMultiplier

  return durations.map((duration) => ({
    isAnomaly: duration > threshold,
    threshold,
  }))
}
