// Shared minute ticker to avoid creating many setInterval timers for each component.
// Subscribers receive the current timestamp (ms) whenever the minute ticks.

const subscribers = new Set<(now: number) => void>()
let timerId: ReturnType<typeof setInterval> | null = null

function startTicker() {
  if (timerId) return
  // Align first tick to the start of the next minute for consistency
  const now = Date.now()
  const msToNextMinute = 60_000 - (now % 60_000)

  // First fire at next minute boundary, then every 60s
  timerId = setTimeout(() => {
    // notify immediately at boundary
    const t0 = Date.now()
    subscribers.forEach((fn) => {
      try {
        fn(t0)
      } catch {
        // Ignore individual subscriber errors to prevent one bad subscriber from breaking others
      }
    })

    // subsequent regular ticks
    timerId = setInterval(() => {
      const t = Date.now()
      subscribers.forEach((fn) => {
        try {
          fn(t)
        } catch {
          // Ignore individual subscriber errors to prevent one bad subscriber from breaking others
        }
      })
    }, 60_000)
  }, msToNextMinute) as unknown as ReturnType<typeof setInterval>
}

export function subscribeToMinuteTick(fn: (now: number) => void): () => void {
  subscribers.add(fn)
  // call immediately with current time so subscriber can initialize
  try {
    fn(Date.now())
  } catch {
    // ignore subscriber errors
  }
  startTicker()
  return () => {
    subscribers.delete(fn)
  }
}

export function getNowMs(): number {
  return Date.now()
}
