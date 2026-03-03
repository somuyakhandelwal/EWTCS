'use client'

type HelpEventType = 'open' | 'close' | 'search' | 'start_tour' | 'finish_tour'

interface HelpEventPayload {
  eventType: HelpEventType
  routeKey: string
  query?: string
}

export async function trackHelpEvent(payload: HelpEventPayload) {
  try {
    await fetch('/api/help/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    })
  } catch {
    // Non-blocking telemetry
  }
}
