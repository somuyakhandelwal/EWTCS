import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/lib/auth', () => ({
  requireRole: vi.fn(),
}))

vi.mock('../lib/stage-analytics', () => ({
  getStageDurationStats: vi.fn(),
  getTriageStateDurationStats: vi.fn(),
  getBedAnalyticsSummary: vi.fn(),
}))

import { requireRole } from '@/shared/lib/auth'
import {
  getStageDurationStats,
  getTriageStateDurationStats,
  getBedAnalyticsSummary,
} from '../lib/stage-analytics'
import {
  fetchStageDurationStats,
  fetchTriageStateDurationStats,
} from '../actions/analytics-stage-actions'
import { fetchAnalyticsSummary } from '../actions/analytics-bed-actions'

describe('analytics read access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireRole).mockResolvedValue({ userId: 'auditor-1', role: 'auditor' } as never)
  })

  it('allows auditor on stage duration stats', async () => {
    vi.mocked(getStageDurationStats).mockResolvedValue([])

    const result = await fetchStageDurationStats()

    expect(requireRole).toHaveBeenCalledWith(['supervisor', 'admin', 'auditor'])
    expect(result.success).toBe(true)
  })

  it('allows auditor on analytics summary', async () => {
    vi.mocked(getBedAnalyticsSummary).mockResolvedValue({
      totalBedsUsed: 10,
      totalTransitions: 20,
      averageTimePerPatientMs: 3000,
      averageTransitionsPerPatient: 2,
      totalPatientsProcessed: 8,
    })

    const result = await fetchAnalyticsSummary()

    expect(requireRole).toHaveBeenCalledWith(['supervisor', 'admin', 'auditor'])
    expect(result.success).toBe(true)
    expect(result.data?.totalBedsUsed).toBe(10)
  })

  it('allows auditor on triage state duration stats', async () => {
    vi.mocked(getTriageStateDurationStats).mockResolvedValue([])

    const result = await fetchTriageStateDurationStats()

    expect(requireRole).toHaveBeenCalledWith(['supervisor', 'admin', 'auditor'])
    expect(result.success).toBe(true)
  })
})
