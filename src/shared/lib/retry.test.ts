import { describe, expect, it, vi } from 'vitest'
import { retryAsync } from './retry'

describe('retryAsync', () => {
  it('retries failed operation and eventually resolves', async () => {
    const operation = vi
      .fn<(_: number) => Promise<string>>()
      .mockRejectedValueOnce(new Error('first fail'))
      .mockRejectedValueOnce(new Error('second fail'))
      .mockResolvedValue('ok')

    const result = await retryAsync(operation, {
      retries: 2,
      baseDelayMs: 1,
    })

    expect(result).toBe('ok')
    expect(operation).toHaveBeenCalledTimes(3)
    expect(operation).toHaveBeenNthCalledWith(1, 1)
    expect(operation).toHaveBeenNthCalledWith(2, 2)
    expect(operation).toHaveBeenNthCalledWith(3, 3)
  })

  it('throws after retries are exhausted', async () => {
    const operation = vi
      .fn<(_: number) => Promise<string>>()
      .mockRejectedValue(new Error('still failing'))

    await expect(
      retryAsync(operation, {
        retries: 2,
        baseDelayMs: 1,
      })
    ).rejects.toThrow('still failing')

    expect(operation).toHaveBeenCalledTimes(3)
  })
})
