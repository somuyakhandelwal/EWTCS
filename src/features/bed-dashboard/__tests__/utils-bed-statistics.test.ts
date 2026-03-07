import { describe, it, expect } from 'vitest'
import { getBedStatistics } from '../lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// getBedStatistics
// ─────────────────────────────────────────────────────────────────────────────
describe('getBedStatistics', () => {
  it('returns all zeros and null average for empty array', () => {
    const stats = getBedStatistics([])
    expect(stats.total).toBe(0)
    expect(stats.occupied).toBe(0)
    expect(stats.available).toBe(0)
    expect(stats.delayed).toBe(0)
    expect(stats.occupancyPercentage).toBe(0)
    expect(stats.averageElapsedTimeMs).toBeNull()
  })

  it('counts total beds correctly', () => {
    const beds = [
      { isOccupied: true, isDelayed: false, elapsedTimeMs: 3_600_000 },
      { isOccupied: false, isDelayed: false, elapsedTimeMs: null },
      { isOccupied: true, isDelayed: true, elapsedTimeMs: 7_200_000 },
    ]
    expect(getBedStatistics(beds).total).toBe(3)
  })

  it('occupied + available = total', () => {
    const beds = [
      { isOccupied: true, isDelayed: false, elapsedTimeMs: 3_600_000 },
      { isOccupied: false, isDelayed: false, elapsedTimeMs: null },
      { isOccupied: false, isDelayed: false, elapsedTimeMs: null },
    ]
    const stats = getBedStatistics(beds)
    expect(stats.occupied + stats.available).toBe(stats.total)
  })

  it('counts delayed beds correctly', () => {
    const beds = [
      { isOccupied: true, isDelayed: true, elapsedTimeMs: 12_600_000 },
      { isOccupied: true, isDelayed: true, elapsedTimeMs: 14_400_000 },
      { isOccupied: true, isDelayed: false, elapsedTimeMs: 3_600_000 },
      { isOccupied: false, isDelayed: false, elapsedTimeMs: null },
    ]
    expect(getBedStatistics(beds).delayed).toBe(2)
  })

  it('averageElapsedTimeMs is null when no occupied beds have a time', () => {
    const beds = [
      { isOccupied: false, isDelayed: false, elapsedTimeMs: null },
      { isOccupied: false, isDelayed: false, elapsedTimeMs: null },
    ]
    expect(getBedStatistics(beds).averageElapsedTimeMs).toBeNull()
  })

  it('averageElapsedTimeMs is null when elapsedTimeMs is null on occupied beds', () => {
    const beds = [{ isOccupied: true, isDelayed: false, elapsedTimeMs: null }]
    expect(getBedStatistics(beds).averageElapsedTimeMs).toBeNull()
  })

  it('calculates average elapsed time across occupied beds with times', () => {
    const beds = [
      { isOccupied: true, isDelayed: false, elapsedTimeMs: 3_600_000 },
      { isOccupied: true, isDelayed: false, elapsedTimeMs: 7_200_000 },
      { isOccupied: false, isDelayed: false, elapsedTimeMs: null },
    ]
    expect(getBedStatistics(beds).averageElapsedTimeMs).toBe(5_400_000)
  })

  it('occupancyPercentage is consistent with calculateOccupancyPercentage', () => {
    const beds = [
      { isOccupied: true, isDelayed: false, elapsedTimeMs: 3_600_000 },
      { isOccupied: true, isDelayed: true, elapsedTimeMs: 7_200_000 },
      { isOccupied: false, isDelayed: false, elapsedTimeMs: null },
      { isOccupied: false, isDelayed: false, elapsedTimeMs: null },
    ]
    expect(getBedStatistics(beds).occupancyPercentage).toBe(50)
  })

  it('all 12 beds occupied → 100% occupancy, available=0', () => {
    const beds = Array.from({ length: 12 }, () => ({
      isOccupied: true,
      isDelayed: false,
      elapsedTimeMs: 1_800_000,
    }))
    const stats = getBedStatistics(beds)
    expect(stats.occupancyPercentage).toBe(100)
    expect(stats.available).toBe(0)
    expect(stats.averageElapsedTimeMs).toBe(1_800_000)
  })
})
