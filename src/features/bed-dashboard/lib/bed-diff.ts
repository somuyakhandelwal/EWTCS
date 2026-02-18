// Bed Data Diffing Utility
// Epic 1: Nurse Desk Bed Dashboard
// US-1.2: Display Real-Time Bed Status
// Purpose: Smart comparison to prevent unnecessary re-renders

import type { BedWithElapsedTime } from '../types/bed'

/**
 * Check if two bed objects are meaningfully different
 * Ignores minor timestamp differences to prevent flickering
 */
export function hasBedChanged(oldBed: BedWithElapsedTime, newBed: BedWithElapsedTime): boolean {
  // Check critical fields that should trigger UI update
  if (oldBed.id !== newBed.id) return true
  if (oldBed.bedNumber !== newBed.bedNumber) return true
  if (oldBed.isOccupied !== newBed.isOccupied) return true
  if (oldBed.isDelayed !== newBed.isDelayed) return true
  
  // Check stage changes
  if (oldBed.currentStage?.id !== newBed.currentStage?.id) return true
  if (oldBed.currentStage?.name !== newBed.currentStage?.name) return true
  
  // Check elapsed time (only if difference > 30 seconds to avoid constant updates)
  const timeDiff = Math.abs((oldBed.elapsedTimeMs || 0) - (newBed.elapsedTimeMs || 0))
  if (timeDiff > 30000) return true // 30 seconds threshold
  
  return false
}

/**
 * Compare two arrays of beds and return true if any meaningful changes detected
 */
export function hasBedsChanged(
  oldBeds: BedWithElapsedTime[],
  newBeds: BedWithElapsedTime[]
): boolean {
  // Different length = changed
  if (oldBeds.length !== newBeds.length) return true
  
  // Create maps for efficient lookup
  const oldMap = new Map(oldBeds.map(bed => [bed.id, bed]))
  const newMap = new Map(newBeds.map(bed => [bed.id, bed]))
  
  // Check if any bed is missing or new
  for (const bedId of oldMap.keys()) {
    if (!newMap.has(bedId)) return true
  }
  for (const bedId of newMap.keys()) {
    if (!oldMap.has(bedId)) return true
  }
  
  // Check if any bed has changed
  for (const [bedId, newBed] of newMap) {
    const oldBed = oldMap.get(bedId)
    if (oldBed && hasBedChanged(oldBed, newBed)) {
      return true
    }
  }
  
  return false
}

/**
 * Create a stable reference for beds data if no meaningful changes
 * This prevents React re-renders when data is the same
 */
export function getStableBeds(
  oldBeds: BedWithElapsedTime[],
  newBeds: BedWithElapsedTime[]
): BedWithElapsedTime[] {
  return hasBedsChanged(oldBeds, newBeds) ? newBeds : oldBeds
}

/**
 * Calculate a fingerprint for bed data for quick comparison
 * Useful for debugging and logging
 */
export function getBedFingerprint(bed: BedWithElapsedTime): string {
  return `${bed.id}:${bed.bedNumber}:${bed.isOccupied}:${bed.currentStage?.id || 'none'}:${bed.isDelayed}`
}

/**
 * Calculate fingerprint for entire bed array
 */
export function getBedsFingerprint(beds: BedWithElapsedTime[]): string {
  return beds.map(getBedFingerprint).join('|')
}
