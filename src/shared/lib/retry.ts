export interface RetryOptions {
  retries: number
  baseDelayMs?: number
  backoffMultiplier?: number
  shouldRetry?: (error: unknown, attempt: number) => boolean
}

const NON_RETRYABLE_PATTERNS = [
  'invalid',
  'required',
  'not found',
  'unauthorized',
  'forbidden',
  'validation',
  'supervisor',
  'must be',
]

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function isTransientError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  return !NON_RETRYABLE_PATTERNS.some(pattern => message.includes(pattern))
}

export async function retryAsync<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const {
    retries,
    baseDelayMs = 250,
    backoffMultiplier = 2,
    shouldRetry = () => true,
  } = options

  let attempt = 1
  let delay = baseDelayMs

  while (true) {
    try {
      return await operation(attempt)
    } catch (error) {
      const canRetry = attempt <= retries && shouldRetry(error, attempt)
      if (!canRetry) throw error
      await wait(delay)
      delay *= backoffMultiplier
      attempt += 1
    }
  }
}
