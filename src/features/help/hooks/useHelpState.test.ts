import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useHelpState } from './useHelpState'

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}))

const { getUserSettingsMock, updateUserSettingsMock } = vi.hoisted(() => ({
  getUserSettingsMock: vi.fn(),
  updateUserSettingsMock: vi.fn(),
}))

vi.mock('@/features/bed-dashboard/actions/user-settings-actions', () => ({
  getUserSettings: getUserSettingsMock,
  updateUserSettings: updateUserSettingsMock,
}))

const DEFAULT_PREFERENCES = {
  confirmCriticalStages: true,
  showDelayedOnly: false,
  sortOrder: 'none' as const,
  helpPanelOpen: false,
}

describe('useHelpState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUserSettingsMock.mockResolvedValue(DEFAULT_PREFERENCES)
  })

  it('starts closed before async preferences load', () => {
    const { result } = renderHook(() => useHelpState())
    expect(result.current.isOpen).toBe(false)
    expect(result.current.prefsLoaded).toBe(false)
  })

  it('loads persisted open state from DB on mount', async () => {
    getUserSettingsMock.mockResolvedValue({ ...DEFAULT_PREFERENCES, helpPanelOpen: true })

    const { result } = renderHook(() => useHelpState())

    await waitFor(() => expect(result.current.prefsLoaded).toBe(true))
    expect(result.current.isOpen).toBe(true)
  })

  it('openHelp sets isOpen to true and persists to DB', () => {
    const { result } = renderHook(() => useHelpState())
    act(() => { result.current.openHelp() })
    expect(result.current.isOpen).toBe(true)
    expect(updateUserSettingsMock).toHaveBeenCalledWith({ helpPanelOpen: true })
  })

  it('closeHelp sets isOpen to false and persists to DB', () => {
    const { result } = renderHook(() => useHelpState())
    act(() => { result.current.closeHelp() })
    expect(result.current.isOpen).toBe(false)
    expect(updateUserSettingsMock).toHaveBeenCalledWith({ helpPanelOpen: false })
  })

  it('toggleHelp opens when closed', () => {
    const { result } = renderHook(() => useHelpState())
    act(() => { result.current.toggleHelp() })
    expect(result.current.isOpen).toBe(true)
  })

  it('toggleHelp closes when open', async () => {
    getUserSettingsMock.mockResolvedValue({ ...DEFAULT_PREFERENCES, helpPanelOpen: true })

    const { result } = renderHook(() => useHelpState())

    await waitFor(() => expect(result.current.prefsLoaded).toBe(true))
    act(() => { result.current.toggleHelp() })
    expect(result.current.isOpen).toBe(false)
  })

  it('toggleHelp persists the new state to DB', () => {
    const { result } = renderHook(() => useHelpState())
    act(() => { result.current.toggleHelp() })
    expect(updateUserSettingsMock).toHaveBeenCalledWith({ helpPanelOpen: true })
  })

  it('returns the dashboard context for /dashboard pathname', () => {
    const { result } = renderHook(() => useHelpState())
    expect(result.current.context.routeKey).toBe('/dashboard')
    expect(result.current.context.pageTitle).toContain('Dashboard')
  })

  it('exposes the current pathname', () => {
    const { result } = renderHook(() => useHelpState())
    expect(result.current.pathname).toBe('/dashboard')
  })
})
