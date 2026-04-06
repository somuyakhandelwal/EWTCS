import type { QueuedEntry } from '../lib/offline-queue-types'

const QUEUE_STORAGE_KEY = 'ewtcs_offline_queue'

let idCounter = 0

export function generateQueueId(): string {
  return `oq-${Date.now()}-${++idCounter}`
}

export function readQueueFromStorage(): QueuedEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as QueuedEntry[]
    return parsed.map((entry) => ({
      ...entry,
      clientOperationId: entry.clientOperationId || entry.id,
    }))
  } catch {
    return []
  }
}

export function writeQueueToStorage(queue: QueuedEntry[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue))
  } catch {
    // quota exceeded — best-effort persistence
  }
}

export function clearQueueStorage(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(QUEUE_STORAGE_KEY)
  } catch {
    // ignore storage cleanup failures
  }
}
