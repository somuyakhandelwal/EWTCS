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

vi.mock('../lib/stage-analytics', () => ({
  getErCleaningTatSummary: vi.fn(),
  getErTatSummary: vi.fn(),
  getTriageCleaningTatSummary: vi.fn(),
  getTriageTatSummary: vi.fn(),
}))

import { query } from '@/shared/lib/db'
import {
  getErCleaningTatSummary,
  getErTatSummary,
  getTriageCleaningTatSummary,
  getTriageTatSummary,
} from '../lib/stage-analytics'
import { getDepartmentMetrics } from '../actions/department-metrics'
import {
  defaultWorkflowSummaries,
  emptyWorkflowSummary,
  selectResult,
} from './department-metrics.test-helpers'

describe('department-metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getTriageTatSummary).mockResolvedValue(defaultWorkflowSummaries.triage)
    vi.mocked(getTriageCleaningTatSummary).mockResolvedValue(
      defaultWorkflowSummaries.triageCleaning
    )
    vi.mocked(getErTatSummary).mockResolvedValue(defaultWorkflowSummaries.emergency)
    vi.mocked(getErCleaningTatSummary).mockResolvedValue(
      defaultWorkflowSummaries.emergencyCleaning
    )
  })

  it('getDepartmentMetrics returns correctly formatted metrics on success', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce(selectResult([{ occupied_beds: '10', total_beds: '20' }]))
      .mockResolvedValueOnce(selectResult([{ occupied_beds: '8', total_beds: '12' }]))
      .mockResolvedValueOnce(
        selectResult([{ in_progress: '2', completed: '5', total_rooms: '16' }])
      )
      .mockResolvedValueOnce(
        selectResult([{ active_procedures: '1', cag_count: '2', ptca_count: '3' }])
      )

    const result = await getDepartmentMetrics()

    expect(query).toHaveBeenCalledTimes(4)

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data?.triage.occupiedBeds).toBe(10)
    expect(result.data?.triage.totalBeds).toBe(20)
    expect(result.data?.triage.averageTatMinutes).toBe(15.5)
    expect(result.data?.triage.tatCycleCount).toBe(3)
    expect(result.data?.triage.averageCleaningMinutes).toBe(7)
    expect(result.data?.triage.cleaningCycleCount).toBe(2)

    expect(result.data?.emergency.occupiedBeds).toBe(8)
    expect(result.data?.emergency.totalBeds).toBe(12)
    expect(result.data?.emergency.averageTatMinutes).toBe(30)
    expect(result.data?.emergency.averageCleaningMinutes).toBe(10)

    expect(result.data?.ot.inProgress).toBe(2)
    expect(result.data?.ot.completed).toBe(5)
    expect(result.data?.ot.utilizationRate).toBe(13) // Math.round(2 / 16 * 100) = 13

    expect(result.data?.cathLab.activeProcedures).toBe(1)
    expect(result.data?.cathLab.cagCount).toBe(2)
    expect(result.data?.cathLab.ptcaCount).toBe(3)
  })

  it('getDepartmentMetrics handles zero or missing counts gracefully', async () => {
    vi.mocked(getTriageTatSummary).mockResolvedValueOnce(emptyWorkflowSummary)
    vi.mocked(getTriageCleaningTatSummary).mockResolvedValueOnce(emptyWorkflowSummary)
    vi.mocked(getErTatSummary).mockResolvedValueOnce(emptyWorkflowSummary)
    vi.mocked(getErCleaningTatSummary).mockResolvedValueOnce(emptyWorkflowSummary)
    vi.mocked(query).mockResolvedValue(selectResult([]))

    const result = await getDepartmentMetrics()

    expect(result.success).toBe(true)
    expect(result.data?.triage.occupiedBeds).toBe(0)
    expect(result.data?.triage.averageTatMinutes).toBe(0)
    expect(result.data?.triage.tatCycleCount).toBe(0)
    expect(result.data?.emergency.occupiedBeds).toBe(0)
    expect(result.data?.emergency.cleaningCycleCount).toBe(0)
    expect(result.data?.ot.utilizationRate).toBe(0)
    expect(result.data?.cathLab.activeProcedures).toBe(0)
  })

  it('getDepartmentMetrics catches errors and returns failure', async () => {
    vi.mocked(query).mockRejectedValueOnce(new Error('DB failure'))

    const result = await getDepartmentMetrics()

    expect(result.success).toBe(false)
    expect(result.error).toBe('Database error fetching metrics')
  })

  it('dispatches intake, OT, and cath queries in parallel', async () => {
    let resolveTriage!: (value: unknown) => void
    let resolveEmergency!: (value: unknown) => void
    let resolveOt!: (value: unknown) => void
    let resolveCath!: (value: unknown) => void

    const triagePromise = new Promise((resolve) => {
      resolveTriage = resolve
    })
    const emergencyPromise = new Promise((resolve) => {
      resolveEmergency = resolve
    })
    const otPromise = new Promise((resolve) => {
      resolveOt = resolve
    })
    const cathPromise = new Promise((resolve) => {
      resolveCath = resolve
    })

    vi.mocked(query)
      .mockImplementationOnce(() => triagePromise as never)
      .mockImplementationOnce(() => emergencyPromise as never)
      .mockImplementationOnce(() => otPromise as never)
      .mockImplementationOnce(() => cathPromise as never)

    const pending = getDepartmentMetrics()

    expect(query).toHaveBeenCalledTimes(4)

    resolveTriage(selectResult([{ occupied_beds: '1', total_beds: '2' }]))
    resolveEmergency(selectResult([{ occupied_beds: '3', total_beds: '4' }]))
    resolveOt(selectResult([{ in_progress: '1', completed: '2', total_rooms: '4' }]))
    resolveCath(
      selectResult([{ active_procedures: '1', cag_count: '2', ptca_count: '3' }])
    )

    const result = await pending
    expect(result.success).toBe(true)
  })

  it('uses triage_state_logs and bed_stage_logs based summary queries separately', async () => {
    vi.mocked(query).mockResolvedValue(selectResult([]) as never)

    await getDepartmentMetrics()

    expect(getTriageTatSummary).toHaveBeenCalledOnce()
    expect(getTriageCleaningTatSummary).toHaveBeenCalledOnce()
    expect(getErTatSummary).toHaveBeenCalledOnce()
    expect(getErCleaningTatSummary).toHaveBeenCalledOnce()
  })
})
