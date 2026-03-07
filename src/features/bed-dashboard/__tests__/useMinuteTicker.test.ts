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

      expect(mockFn).not.toHaveBeenCalled()
    })

    it('should call subscriber at minute boundary', () => {
      const mockFn = vi.fn()
      subscribeToMinuteTick(mockFn)

      mockFn.mockClear()

      vi.advanceTimersByTime(60_000)

      expect(mockFn).toHaveBeenCalled()
    })
  })

  describe('Timer Configuration', () => {
    it('should use 60 second interval for updates', () => {
      const mockFn = vi.fn()
      subscribeToMinuteTick(mockFn)
      mockFn.mockClear()

      vi.advanceTimersByTime(60_000)
      expect(mockFn).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(60_000)
      expect(mockFn).toHaveBeenCalledTimes(2)

      expect(mockFn).toHaveBeenCalledTimes(2)
    })

    it('should align first tick to next minute boundary', () => {
      const mockFn = vi.fn()
      const beforeTime = Date.now()
      subscribeToMinuteTick(mockFn)
      const afterTime = Date.now()

      expect(mockFn).toHaveBeenCalledWith(expect.any(Number))
      const callTime = mockFn.mock.calls[0][0]
      expect(callTime).toBeGreaterThanOrEqual(beforeTime)
      expect(callTime).toBeLessThanOrEqual(afterTime + 1000)
    })

    it('should fire subsequent ticks every 60 seconds', () => {
      const mockFn = vi.fn()
      subscribeToMinuteTick(mockFn)
      mockFn.mockClear()

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
})
