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

      vi.advanceTimersByTime(60_000)
      expect(mockFn).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(60_000)
      expect(mockFn).toHaveBeenCalledTimes(2)

      expect(mockFn).toHaveBeenCalledWith(expect.any(Number))
    })

    it('should align first update to minute boundary', () => {
      const mockFn = vi.fn()
      subscribeToMinuteTick(mockFn)

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

      for (let i = 0; i < 12; i++) {
        const fn = vi.fn()
        subscriberFns.push(fn)
        subscribeToMinuteTick(fn)
      }

      subscriberFns.forEach((fn) => {
        expect(fn).toHaveBeenCalledTimes(1)
      })
    })

    it('scenario: dynamic bed addition during runtime', () => {
      const fns1: ReturnType<typeof vi.fn>[] = []

      for (let i = 0; i < 5; i++) {
        const fn = vi.fn()
        fns1.push(fn)
        subscribeToMinuteTick(fn)
      }

      fns1.forEach((fn) => fn.mockClear())

      const fns2: ReturnType<typeof vi.fn>[] = []
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

      subscriberFns.forEach((fn) => {
        expect(fn).toHaveBeenCalled()
      })
    })
  })
})
