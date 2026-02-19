// Analytics Calculation Utilities
// Purpose: Mathematical and analytical helper functions
// Epic: EPIC 3 - Time Tracking & Stage Logging

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
export function getDelayColorClass(
  durationMs: number | null,
  thresholdMs: number = 3600000
): string {
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
    const date =
      transition.transitionTime instanceof Date
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
