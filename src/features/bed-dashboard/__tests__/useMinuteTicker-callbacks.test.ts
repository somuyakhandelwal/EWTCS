import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('useMinuteTicker', () => {
  type SubscribeToMinuteTick = (callback: (timestamp: number) => void) => () => void
  let subscribeToMinuteTick: SubscribeToMinuteTick

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.useFakeTimers()
    const importedModule = await import('../hooks/useMinuteTicker')
    subscribeToMinuteTick = importedModule.subscribeToMinuteTick
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  describe('Callback Execution', () => {
    it('should call subscriber immediately with current timestamp', () => {
      const mockFn = vi.fn()
      const beforeCall = Date.now()
      subscribeToMinuteTick(mockFn)
      const afterCall = Date.now()

      expect(mockFn).toHaveBeenCalledWith(expect.any(Number))
      const callArg = mockFn.mock.calls[0][0]
      expect(callArg).toBeGreaterThanOrEqual(beforeCall - 1)
      expect(callArg).toBeLessThanOrEqual(afterCall + 1)
    })

    it('should handle subscriber errors gracefully', () => {
      const errorFn = vi.fn(() => {
        throw new Error('Subscriber error')
      })
      const safeFn = vi.fn()

      expect(() => subscribeToMinuteTick(errorFn)).not.toThrow()
      subscribeToMinuteTick(safeFn)

      expect(errorFn).toHaveBeenCalled()
      expect(safeFn).toHaveBeenCalled()

      errorFn.mockClear()
      safeFn.mockClear()

      expect(() => vi.advanceTimersByTime(60_000)).not.toThrow()
      expect(safeFn).toHaveBeenCalled()
    })

    it('should pass current timestamp to all subscribers', () => {
      const fn1 = vi.fn()
      const fn2 = vi.fn()

      subscribeToMinuteTick(fn1)
      subscribeToMinuteTick(fn2)

      const timestamp1 = fn1.mock.calls[0][0]
      const timestamp2 = fn2.mock.calls[0][0]

      expect(Math.abs(timestamp1 - timestamp2)).toBeLessThan(100)
    })
  })

  describe('Memory Efficiency', () => {
    it('should use single timer instance for multiple subscribers', () => {
      const fn1 = vi.fn()
      const fn2 = vi.fn()
      const fn3 = vi.fn()

      subscribeToMinuteTick(fn1)
      subscribeToMinuteTick(fn2)
      subscribeToMinuteTick(fn3)

      fn1.mockClear()
      fn2.mockClear()
      fn3.mockClear()

      vi.advanceTimersByTime(60_000)

      expect(fn1).toHaveBeenCalledTimes(1)
      expect(fn2).toHaveBeenCalledTimes(1)
      expect(fn3).toHaveBeenCalledTimes(1)
    })

    it('should cleanup when unsubscribed', () => {
      const fn1 = vi.fn()
      const unsub1 = subscribeToMinuteTick(fn1)

      fn1.mockClear()

      unsub1()
      vi.advanceTimersByTime(60_000)

      expect(fn1).not.toHaveBeenCalled()
    })

    it('should handle multiple unsubscribes', () => {
      const fn1 = vi.fn()
      const fn2 = vi.fn()

      const unsub1 = subscribeToMinuteTick(fn1)
      const unsub2 = subscribeToMinuteTick(fn2)

      fn1.mockClear()
      fn2.mockClear()

      unsub1()
      vi.advanceTimersByTime(60_000)

      expect(fn1).not.toHaveBeenCalled()
      expect(fn2).toHaveBeenCalledTimes(1)

      unsub2()
      fn2.mockClear()
      vi.advanceTimersByTime(60_000)

      expect(fn1).not.toHaveBeenCalled()
      expect(fn2).not.toHaveBeenCalled()
    })
  })
})
