// Bed Dashboard Utility Functions
// Epic 1: Nurse Desk Bed Dashboard

/**
 * Format elapsed time from milliseconds to human-readable format
 * @param ms - Elapsed time in milliseconds
 * @returns Formatted string (e.g., "2h 45m", "45m", "< 1m")
 */
export function formatElapsedTime(ms: number | null): string {
  if (ms === null || ms < 0) {
    return 'N/A'
  }

  const totalMinutes = Math.floor(ms / 60000)

  if (totalMinutes < 1) {
    return '< 1m'
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) {
    return `${minutes}m`
  }

  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`
}

/**
 * Get delay indicator color classes
 * @param isDelayed - Whether the bed is delayed
 * @returns Tailwind CSS classes for delay indicator
 */
export function getDelayColorClasses(isDelayed: boolean): {
  bg: string
  text: string
  border: string
} {
  if (isDelayed) {
    return {
      bg: 'bg-red-900/50',
      text: 'text-red-300',
      border: 'border-red-700',
    }
  }

  return {
    bg: 'bg-zinc-800',
    text: 'text-zinc-300',
    border: 'border-zinc-700',
  }
}

/**
 * Calculate bed occupancy percentage
 * @param beds - Array of beds
 * @returns Occupancy percentage
 */
export function calculateOccupancyPercentage(
  beds: Array<{ isOccupied: boolean }>
): number {
  if (beds.length === 0) return 0

  const occupiedCount = beds.filter(b => b.isOccupied).length
  return Math.round((occupiedCount / beds.length) * 100)
}

/**
 * Get bed statistics
 * @param beds - Array of beds with elapsed time
 * @returns Statistics object
 */
export function getBedStatistics(
  beds: Array<{ isOccupied: boolean; isDelayed: boolean; elapsedTimeMs: number | null }>
): {
  total: number
  occupied: number
  available: number
  delayed: number
  occupancyPercentage: number
  averageElapsedTimeMs: number | null
} {
  const total = beds.length
  const occupied = beds.filter(b => b.isOccupied).length
  const available = total - occupied
  const delayed = beds.filter(b => b.isDelayed).length
  const occupancyPercentage = calculateOccupancyPercentage(beds)

  const occupiedBeds = beds.filter(b => b.isOccupied && b.elapsedTimeMs !== null)
  const averageElapsedTimeMs = occupiedBeds.length > 0
    ? occupiedBeds.reduce((sum, bed) => sum + (bed.elapsedTimeMs || 0), 0) / occupiedBeds.length
    : null

  return {
    total,
    occupied,
    available,
    delayed,
    occupancyPercentage,
    averageElapsedTimeMs,
  }
}

const CRITICAL_STAGE_KEYWORDS = [
  'discharge',
  'code',
  'critical',
  'deceased',
  'terminal',
  'transfer'
]

/**
 * Check if a stage is considered critical and requires confirmation
 * @param stageName - Name of the stage
 * @returns boolean
 */
export function isCriticalStage(stageName: string): boolean {
  if (!stageName) return false
  const normalizedStageName = stageName.toLowerCase()
  return CRITICAL_STAGE_KEYWORDS.some(keyword =>
    normalizedStageName.includes(keyword)
  )
}

// Re-export from shared utility for backward compatibility
export { getStageColorClasses } from '@/shared/utils/stage-colors'