import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHelpState } from './useHelpState'

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}))

const STORAGE_KEY = 'ewtcs_help_panel_open'

describe('useHelpState', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts closed when localStorage has no entry', () => {
    const { result } = renderHook(() => useHelpState())
    expect(result.current.isOpen).toBe(false)
  })

  it('starts open when localStorage has "1"', () => {
    localStorage.setItem(STORAGE_KEY, '1')
    const { result } = renderHook(() => useHelpState())
    expect(result.current.isOpen).toBe(true)
  })

  it('openHelp sets isOpen to true and persists "1"', () => {
    const { result } = renderHook(() => useHelpState())
    act(() => { result.current.openHelp() })
    expect(result.current.isOpen).toBe(true)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('1')
  })

  it('closeHelp sets isOpen to false and persists "0"', () => {
    localStorage.setItem(STORAGE_KEY, '1')
    const { result } = renderHook(() => useHelpState())
    act(() => { result.current.closeHelp() })
    expect(result.current.isOpen).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('0')
  })

  it('toggleHelp opens when closed', () => {
    const { result } = renderHook(() => useHelpState())
    act(() => { result.current.toggleHelp() })
    expect(result.current.isOpen).toBe(true)
  })

  it('toggleHelp closes when open', () => {
    localStorage.setItem(STORAGE_KEY, '1')
    const { result } = renderHook(() => useHelpState())
    act(() => { result.current.toggleHelp() })
    expect(result.current.isOpen).toBe(false)
  })

  it('toggleHelp persists the new state', () => {
    const { result } = renderHook(() => useHelpState())
    act(() => { result.current.toggleHelp() })
    expect(localStorage.getItem(STORAGE_KEY)).toBe('1')
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
