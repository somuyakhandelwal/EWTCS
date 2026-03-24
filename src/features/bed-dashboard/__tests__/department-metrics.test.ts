import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/lib/db', () => ({
  query: vi.fn(),
}))

vi.mock('@/shared/config/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

import { query } from '@/shared/lib/db'
import { getDepartmentMetrics } from '../actions/department-metrics'

describe('department-metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getDepartmentMetrics returns correctly formatted metrics on success', async () => {
    // Mock Triage metrics
    vi.mocked(query).mockResolvedValueOnce({
      rows: [
        {
          occupied_beds: '10',
          total_beds: '20',
          avg_triage_time: '15.5'
        }
      ],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: []
    })

    // Mock OT metrics
    vi.mocked(query).mockResolvedValueOnce({
      rows: [
        {
          in_progress: '2',
          completed: '5',
          total_rooms: '16'
        }
      ],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: []
    })

    // Mock Cath Lab metrics
    vi.mocked(query).mockResolvedValueOnce({
      rows: [
        {
          active_procedures: '1',
          cag_count: '2',
          ptca_count: '3'
        }
      ],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: []
    })

    const result = await getDepartmentMetrics()

    expect(query).toHaveBeenCalledTimes(3)
    
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data?.triage.occupiedBeds).toBe(10)
    expect(result.data?.triage.totalBeds).toBe(20)
    expect(result.data?.triage.avgTriageTime).toBe(15.5)
    
    expect(result.data?.ot.inProgress).toBe(2)
    expect(result.data?.ot.completed).toBe(5)
    expect(result.data?.ot.utilizationRate).toBe(13) // Math.round(2 / 16 * 100) = 13
    
    expect(result.data?.cathLab.activeProcedures).toBe(1)
    expect(result.data?.cathLab.cagCount).toBe(2)
    expect(result.data?.cathLab.ptcaCount).toBe(3)
  })

  it('getDepartmentMetrics handles zero or missing counts gracefully', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [],
      rowCount: 0,
      command: 'SELECT',
      oid: 0,
      fields: []
    })

    const result = await getDepartmentMetrics()

    expect(result.success).toBe(true)
    expect(result.data?.triage.occupiedBeds).toBe(0)
    expect(result.data?.ot.utilizationRate).toBe(0)
    expect(result.data?.cathLab.activeProcedures).toBe(0)
  })

  it('getDepartmentMetrics catches errors and returns failure', async () => {
    vi.mocked(query).mockRejectedValueOnce(new Error('DB failure'))

    const result = await getDepartmentMetrics()

    expect(result.success).toBe(false)
    expect(result.error).toBe('Database error fetching metrics')
  })
})
