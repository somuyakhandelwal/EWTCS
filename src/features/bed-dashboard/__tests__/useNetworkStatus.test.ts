/**
 * useNetworkStatus.test.ts
 * US-16.2: Enable Offline UI
 * Tests for useNetworkStatus hook — reads navigator.onLine on mount and
 * reacts to 'online' / 'offline' window events.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

// ── Helpers ───────────────────────────────────────────────────────────────────

function setNavigatorOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    get: () => value,
  })
}

function fireNetworkEvent(type: 'online' | 'offline') {
  window.dispatchEvent(new Event(type))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useNetworkStatus', () => {
  beforeEach(() => {
    setNavigatorOnline(true)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns isOnline=true when navigator.onLine is true', () => {
    setNavigatorOnline(true)
    const { result } = renderHook(() => useNetworkStatus())
    expect(result.current.isOnline).toBe(true)
  })

  it('returns isOnline=false when navigator.onLine is false', () => {
    setNavigatorOnline(false)
    const { result } = renderHook(() => useNetworkStatus())
    expect(result.current.isOnline).toBe(false)
  })

  it('updates isOnline to false when the offline event fires', () => {
    setNavigatorOnline(true)
    const { result } = renderHook(() => useNetworkStatus())
    expect(result.current.isOnline).toBe(true)

    act(() => { fireNetworkEvent('offline') })

    expect(result.current.isOnline).toBe(false)
  })

  it('updates isOnline to true when the online event fires', () => {
    setNavigatorOnline(false)
    const { result } = renderHook(() => useNetworkStatus())
    expect(result.current.isOnline).toBe(false)

    act(() => { fireNetworkEvent('online') })

    expect(result.current.isOnline).toBe(true)
  })

  it('handles online → offline → online transition', () => {
    setNavigatorOnline(true)
    const { result } = renderHook(() => useNetworkStatus())

    act(() => { fireNetworkEvent('offline') })
    expect(result.current.isOnline).toBe(false)

    act(() => { fireNetworkEvent('online') })
    expect(result.current.isOnline).toBe(true)
  })

  it('removes event listeners on unmount (no dangling handlers)', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => useNetworkStatus())

    const onlineCalls = addSpy.mock.calls.filter(c => c[0] === 'online').length
    const offlineCalls = addSpy.mock.calls.filter(c => c[0] === 'offline').length
    expect(onlineCalls).toBe(1)
    expect(offlineCalls).toBe(1)

    unmount()

    const removeOnline = removeSpy.mock.calls.filter(c => c[0] === 'online').length
    const removeOffline = removeSpy.mock.calls.filter(c => c[0] === 'offline').length
    expect(removeOnline).toBe(1)
    expect(removeOffline).toBe(1)
  })
})
