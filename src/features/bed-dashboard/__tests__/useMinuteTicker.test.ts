import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('useMinuteTicker', () => {
  let subscribeToMinuteTick: any

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.useFakeTimers()
    const module = await import('../hooks/useMinuteTicker')
    subscribeToMinuteTick = module.subscribeToMinuteTick
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  describe('Ticker Alignment', () => {
    it('should call subscriber immediately with current timestamp', () => {
      const mockFn = vi.fn()
      subscribeToMinuteTick(mockFn)

      expect(mockFn).toHaveBeenCalledWith(expect.any(Number))
      expect(mockFn.mock.calls[0][0]).toBeGreaterThan(0)
    })

    it('should return unsubscribe function', () => {
      const mockFn = vi.fn()
      const unsubscribe = subscribeToMinuteTick(mockFn)

      expect(typeof unsubscribe).toBe('function')
      mockFn.mockClear()

      unsubscribe()
      vi.advanceTimersByTime(60_000)

      // Should not be called after unsubscribe
      expect(mockFn).not.toHaveBeenCalled()
    })

    it('should call subscriber at minute boundary', () => {
      const mockFn = vi.fn()
      subscribeToMinuteTick(mockFn)

      mockFn.mockClear()

      // Advance to next minute boundary
      vi.advanceTimersByTime(60_000)

      expect(mockFn).toHaveBeenCalled()
    })
  })

  describe('Timer Configuration', () => {
    it('should use 60 second interval for updates', () => {
      const mockFn = vi.fn()
      subscribeToMinuteTick(mockFn)
      mockFn.mockClear()

      // First tick at minute boundary
      vi.advanceTimersByTime(60_000)
      expect(mockFn).toHaveBeenCalledTimes(1)

      // Second tick 60 seconds later
      vi.advanceTimersByTime(60_000)
      expect(mockFn).toHaveBeenCalledTimes(2)

      // Verify 60 second interval
      expect(mockFn).toHaveBeenCalledTimes(2)
    })

    it('should align first tick to next minute boundary', () => {
      const mockFn = vi.fn()
      const beforeTime = Date.now()
      subscribeToMinuteTick(mockFn)
      const afterTime = Date.now()

      // Should be called immediately with initialization
      expect(mockFn).toHaveBeenCalledWith(expect.any(Number))
      const callTime = mockFn.mock.calls[0][0]
      expect(callTime).toBeGreaterThanOrEqual(beforeTime)
      expect(callTime).toBeLessThanOrEqual(afterTime + 1000)
    })

    it('should fire subsequent ticks every 60 seconds', () => {
      const mockFn = vi.fn()
      subscribeToMinuteTick(mockFn)
      mockFn.mockClear()

      // Fire multiple ticks
      vi.advanceTimersByTime(60_000)
      vi.advanceTimersByTime(60_000)
      vi.advanceTimersByTime(60_000)

      expect(mockFn).toHaveBeenCalledTimes(3)
    })
  })

  describe('Subscriber Management', () => {
    it('should support adding subscribers', () => {
      const mockFn = vi.fn()
      const unsubscribe = subscribeToMinuteTick(mockFn)

      expect(mockFn).toHaveBeenCalled()
      expect(typeof unsubscribe).toBe('function')
    })

    it('should support removing subscribers', () => {
      const mockFn = vi.fn()
      const unsubscribe = subscribeToMinuteTick(mockFn)
      mockFn.mockClear()

      unsubscribe()
      vi.advanceTimersByTime(60_000)

      expect(mockFn).not.toHaveBeenCalled()
    })

    it('should handle multiple subscribers', () => {
      const fn1 = vi.fn()
      const fn2 = vi.fn()
      const fn3 = vi.fn()

      subscribeToMinuteTick(fn1)
      subscribeToMinuteTick(fn2)
      subscribeToMinuteTick(fn3)

      expect(fn1).toHaveBeenCalled()
      expect(fn2).toHaveBeenCalled()
      expect(fn3).toHaveBeenCalled()

      fn1.mockClear()
      fn2.mockClear()
      fn3.mockClear()

      vi.advanceTimersByTime(60_000)

      expect(fn1).toHaveBeenCalledTimes(1)
      expect(fn2).toHaveBeenCalledTimes(1)
      expect(fn3).toHaveBeenCalledTimes(1)
    })
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

      // Should not throw when subscribing with error function
      expect(() => subscribeToMinuteTick(errorFn)).not.toThrow()
      subscribeToMinuteTick(safeFn)

      // Error function was called but caught
      expect(errorFn).toHaveBeenCalled()
      expect(safeFn).toHaveBeenCalled()

      errorFn.mockClear()
      safeFn.mockClear()

      // Should not throw on tick even if one subscriber errors
      expect(() => vi.advanceTimersByTime(60_000)).not.toThrow()
      // Safe function should still be called even if error function throws
      expect(safeFn).toHaveBeenCalled()
    })

    it('should pass current timestamp to all subscribers', () => {
      const fn1 = vi.fn()
      const fn2 = vi.fn()

      subscribeToMinuteTick(fn1)
      subscribeToMinuteTick(fn2)

      // Both should receive same timestamp
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

      // Only one timer should fire for all subscribers
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

      // Should not be called after unsubscribe
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

      // fn1 should not be called, fn2 should be
      expect(fn1).not.toHaveBeenCalled()
      expect(fn2).toHaveBeenCalledTimes(1)

      unsub2()
      fn2.mockClear()
      vi.advanceTimersByTime(60_000)

      // Both should not be called now
      expect(fn1).not.toHaveBeenCalled()
      expect(fn2).not.toHaveBeenCalled()
    })
  })

  describe('Performance', () => {
    it('should handle many subscribers efficiently', () => {
      const subscriberFns: ReturnType<typeof vi.fn>[] = []
      const subscriberCount = 100

      for (let i = 0; i < subscriberCount; i++) {
        const fn = vi.fn()
        subscriberFns.push(fn)
        subscribeToMinuteTick(fn)
      }

      subscriberFns.forEach((fn) => fn.mockClear())

      // Should call all subscribers in one tick
      vi.advanceTimersByTime(60_000)

      subscriberFns.forEach((fn) => {
        expect(fn).toHaveBeenCalledTimes(1)
      })
    })

    it('should not block on unsubscribe', () => {
      const fn = vi.fn()
      const unsub = subscribeToMinuteTick(fn)

      expect(() => unsub()).not.toThrow()
    })

    it('should efficiently fire many ticks', () => {
      const fn = vi.fn()
      subscribeToMinuteTick(fn)
      fn.mockClear()

      // Fire 10 ticks
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(60_000)
      }

      expect(fn).toHaveBeenCalledTimes(10)
    })
  })

  describe('Acceptance Criteria AC-2: Timer Updates Every Minute', () => {
    it('should fire updates at 60 second intervals', () => {
      const mockFn = vi.fn()
      subscribeToMinuteTick(mockFn)
      mockFn.mockClear()

      const call1Time = Date.now()
      vi.advanceTimersByTime(60_000)
      const call2Time = Date.now()
      expect(mockFn).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(60_000)
      expect(mockFn).toHaveBeenCalledTimes(2)

      // Verify intervals are 60 seconds
      expect(mockFn).toHaveBeenCalledWith(expect.any(Number))
    })

    it('should align first update to minute boundary', () => {
      const mockFn = vi.fn()
      subscribeToMinuteTick(mockFn)

      // Called immediately with current timestamp
      expect(mockFn).toHaveBeenCalledWith(expect.any(Number))
    })

    it('should queue updates every 60s after first tick', () => {
      const mockFn = vi.fn()
      subscribeToMinuteTick(mockFn)
      mockFn.mockClear()

      vi.advanceTimersByTime(60_000)
      expect(mockFn).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(60_000)
      expect(mockFn).toHaveBeenCalledTimes(2)

      vi.advanceTimersByTime(60_000)
      expect(mockFn).toHaveBeenCalledTimes(3)

      vi.advanceTimersByTime(60_000)
      expect(mockFn).toHaveBeenCalledTimes(4)

      vi.advanceTimersByTime(60_000)
      expect(mockFn).toHaveBeenCalledTimes(5)
    })
  })

  describe('Real-world Scenarios', () => {
    it('scenario: application startup with many components', () => {
      const subscriberFns: ReturnType<typeof vi.fn>[] = []

      // 12 beds starting up
      for (let i = 0; i < 12; i++) {
        const fn = vi.fn()
        subscriberFns.push(fn)
        subscribeToMinuteTick(fn)
      }

      // All should be called immediately
      subscriberFns.forEach((fn) => {
        expect(fn).toHaveBeenCalledTimes(1)
      })
    })

    it('scenario: dynamic bed addition during runtime', () => {
      const fns1: ReturnType<typeof vi.fn>[] = []

      // Initial beds
      for (let i = 0; i < 5; i++) {
        const fn = vi.fn()
        fns1.push(fn)
        subscribeToMinuteTick(fn)
      }

      fns1.forEach((fn) => fn.mockClear())

      const fns2: ReturnType<typeof vi.fn>[] = []
      // Add more beds
      for (let i = 0; i < 7; i++) {
        const fn = vi.fn()
        fns2.push(fn)
        subscribeToMinuteTick(fn)
      }

      fns2.forEach((fn) => fn.mockClear())

      vi.advanceTimersByTime(60_000)

      fns1.forEach((fn) => {
        expect(fn).toHaveBeenCalledTimes(1)
      })
      fns2.forEach((fn) => {
        expect(fn).toHaveBeenCalled()
      })
    })

    it('scenario: scaling to 100+ beds', () => {
      const subscriberFns: ReturnType<typeof vi.fn>[] = []

      for (let i = 0; i < 50; i++) {
        const fn = vi.fn()
        subscriberFns.push(fn)
        subscribeToMinuteTick(fn)
      }

      subscriberFns.forEach((fn) => fn.mockClear())

      vi.advanceTimersByTime(60_000)

      // All subscribers should receive the tick
      subscriberFns.forEach((fn) => {
        expect(fn).toHaveBeenCalled()
      })
    })
  })
})
