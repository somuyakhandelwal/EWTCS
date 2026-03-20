import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { DepartmentMetricsView } from '../components/DepartmentMetricsView'
import { getDepartmentMetrics } from '@/features/bed-dashboard/actions/department-metrics'

vi.mock('@/features/bed-dashboard/actions/department-metrics', () => ({
  getDepartmentMetrics: vi.fn(),
}))

describe('DepartmentMetricsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders loading state initially', () => {
    vi.mocked(getDepartmentMetrics).mockReturnValue(new Promise(() => {}))
    render(<DepartmentMetricsView />)
    
    expect(document.querySelector('.animate-spin')).not.toBeNull()
  })

  it('renders metrics data after loading', async () => {
    vi.mocked(getDepartmentMetrics).mockResolvedValue({
      success: true,
      data: {
        triage: { occupiedBeds: 10, totalBeds: 20, avgTriageTime: 15 },
        ot: { inProgress: 2, completed: 5, utilizationRate: 28 },
        cathLab: { activeProcedures: 1, cagCount: 2, ptcaCount: 3 }
      }
    })

    render(<DepartmentMetricsView />)

    await waitFor(() => {
      expect(screen.getByText('Triage Metrics')).toBeDefined()
    })

    expect(screen.getByText('10 / 20')).toBeDefined()
    expect(screen.getByText('15 mins')).toBeDefined()

    expect(screen.getAllByText('2').length).toBeGreaterThan(0) // In progress OT and CAG Count
    expect(screen.getByText('5')).toBeDefined()
    expect(screen.getByText('28%')).toBeDefined()

    expect(screen.getAllByText('1').length).toBeGreaterThan(0) // Active procedures
    expect(screen.getByText('3')).toBeDefined()
  })

  it('polls metrics every 30 seconds', async () => {
    vi.mocked(getDepartmentMetrics).mockResolvedValue({
      success: true,
      data: {
        triage: { occupiedBeds: 10, totalBeds: 20, avgTriageTime: 15 },
        ot: { inProgress: 2, completed: 5, utilizationRate: 28 },
        cathLab: { activeProcedures: 1, cagCount: 2, ptcaCount: 3 }
      }
    })

    const setIntervalSpy = vi.spyOn(global, 'setInterval')

    render(<DepartmentMetricsView />)

    await waitFor(() => {
      expect(getDepartmentMetrics).toHaveBeenCalledTimes(1)
    })

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000)
    
    // Cleanup
    setIntervalSpy.mockRestore()
  })

  it('renders an error card if metrics loading failed', async () => {
    vi.mocked(getDepartmentMetrics).mockResolvedValue({
      success: false,
      error: 'Error'
    })

    render(<DepartmentMetricsView />)

    await waitFor(() => {
      // Excludes the loader, component should show fallback card
      expect(document.querySelector('.animate-spin')).toBeNull()
    })

    expect(screen.getByText('Department metrics unavailable')).toBeDefined()
    expect(screen.getByText('Error')).toBeDefined()
  })
})
