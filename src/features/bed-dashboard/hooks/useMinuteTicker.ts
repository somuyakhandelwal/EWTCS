// Shared minute ticker to avoid creating many setInterval timers for each component.
// Subscribers receive the current timestamp (ms) whenever the minute ticks.

const subscribers = new Set<(now: number) => void>()
let timeoutId: ReturnType<typeof setTimeout> | null = null
let intervalId: ReturnType<typeof setInterval> | null = null

function startTicker() {
  if (timeoutId || intervalId) return
  const now = Date.now()
  const msToNextMinute = 60_000 - (now % 60_000)

  timeoutId = setTimeout(() => {
    timeoutId = null
    const t0 = Date.now()
    subscribers.forEach((fn) => {
      try { fn(t0) } catch { }
    })

    intervalId = setInterval(() => {
      const t = Date.now()
      subscribers.forEach((fn) => {
        try { fn(t) } catch { }
      })
    }, 60_000)
  }, msToNextMinute)
}

function stopTicker() {
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

export function subscribeToMinuteTick(fn: (now: number) => void): () => void {
  subscribers.add(fn)
  try {
    fn(Date.now())
  } catch { }
  startTicker()

  return () => {
    subscribers.delete(fn)
    if (subscribers.size === 0) {
      stopTicker()
    }
  }
}

export function getNowMs(): number {
  return Date.now()
}
