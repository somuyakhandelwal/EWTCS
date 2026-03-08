// Next.js instrumentation hook — Node.js runtime ONLY (instrumentation.node.ts).
// Next.js compiles this file exclusively for Node.js, so pg/https/fs are safe to import.
// US-13.5: Patches logger.error() and logger.critical() to also persist events
// to the error_events DB table without touching logger.ts itself.

export async function register() {
  const [{ logger }, { captureError }] = await Promise.all([
    import('@/shared/config/logger'),
    import('@/lib/server/error-store'),
  ])

  // Preserve original implementations
  const origError    = logger.error.bind(logger)
  const origCritical = logger.critical.bind(logger)

  // Monkey-patch: same signature, adds fire-and-forget DB capture
  logger.error = (message, error?, context?) => {
    origError(message, error, context)
    captureError('ERROR', message, error, context)
  }

  logger.critical = (message, error?, context?) => {
    origCritical(message, error, context)
    captureError('CRITICAL', message, error, context)
  }
}
