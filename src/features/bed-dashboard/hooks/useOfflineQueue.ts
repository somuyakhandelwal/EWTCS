// useOfflineQueue
// US-16.1 + US-16.2: Queue write operations while offline, drain on reconnect.
// The queue is persisted to localStorage so it survives accidental tab refreshes.

'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import type {
  QueuedOperation,
  QueuedEntry,
  DrainHandlers,
  DrainResult,
  UseOfflineQueueReturn,
} from '../lib/offline-queue-types'
export type {
  QueuedOperationType,
  QueuedOperation,
  QueuedEntry,
  DrainHandlers,
  DrainResult,
  UseOfflineQueueReturn,
} from '../lib/offline-queue-types'

const QUEUE_STORAGE_KEY = 'ewtcs_offline_queue'

function readQueueFromStorage(): QueuedEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as QueuedEntry[]
  } catch {
    return []
  }
}

function writeQueueToStorage(queue: QueuedEntry[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue))
  } catch { /* quota exceeded — best-effort */ }
}

function clearQueueStorage(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(QUEUE_STORAGE_KEY)
  } catch { /* ignore */ }
}

let _idCounter = 0
function generateId(): string {
  return `oq-${Date.now()}-${++_idCounter}`
}

export function useOfflineQueue(): UseOfflineQueueReturn {
  // Hydrate from storage on first render
  const [queue, setQueue] = useState<QueuedEntry[]>(() => readQueueFromStorage())
  const [isDraining, setIsDraining] = useState(false)
  const [drainErrors, setDrainErrors] = useState<string[]>([])
  // Guard against concurrent drain calls
  const isDrainingRef = useRef(false)

  const enqueue = useCallback((op: QueuedOperation) => {
    const entry: QueuedEntry = {
      id: generateId(),
      enqueuedAt: new Date().toISOString(),
      op,
    }
    setQueue((prev) => {
      const next = [...prev, entry]
      writeQueueToStorage(next)
      return next
    })
  }, [])

  const drainQueue = useCallback(async (handlers: DrainHandlers): Promise<DrainResult> => {
    if (isDrainingRef.current) {
      return { succeeded: 0, failed: 0, errors: ['Drain already in progress'], conflicts: [] }
    }

    isDrainingRef.current = true
    setIsDraining(true)
    setDrainErrors([])

    // Snapshot the queue so new enqueues during drain are preserved
    const snapshot = readQueueFromStorage()
    const errors: string[] = []
    const succeededIds: string[] = []

    const conflicts: import('../lib/offline-queue-types').ConflictItem[] = []
    const conflictedIds: string[] = []

    for (const entry of snapshot) {
      try {
        let success = false

        if (entry.op.type === 'stage-update') {
          const stageResult = await handlers.onStageUpdate(
            entry.op.bedId,
            entry.op.stageId,
            entry.op.options,
            entry.op.expectedStageId,
          )
          if (stageResult.conflict) {
            conflicts.push({ entry, conflict: stageResult.conflict })
            conflictedIds.push(entry.id)
            continue
          }
          success = stageResult.success
        } else if (entry.op.type === 'discharge') {
          success = await handlers.onDischarge(entry.op.bedId)
        } else if (entry.op.type === 'disposition-reason') {
          success = await handlers.onDispositionReason(entry.op.bedId, entry.op.reason)
        }

        if (success) {
          succeededIds.push(entry.id)
        } else {
          errors.push(`[${entry.op.type}] bed=${entry.op.bedId}: server returned failure`)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`[${entry.op.type}] bed=${entry.op.bedId}: ${msg}`)
      }
    }

    // Remove succeeded + conflicted entries; keep failed ones for retry
    setQueue((prev) => {
      const remove = new Set([...succeededIds, ...conflictedIds])
      const remaining = prev.filter((e) => !remove.has(e.id))
      writeQueueToStorage(remaining)
      return remaining
    })

    isDrainingRef.current = false
    setIsDraining(false)
    setDrainErrors(errors)

    return {
      succeeded: succeededIds.length,
      failed: errors.length,
      errors,
      conflicts,
    }
  }, [])

  const clearQueue = useCallback(() => {
    setQueue([])
    clearQueueStorage()
    setDrainErrors([])
  }, [])

  const queuedBedIds = useMemo(
    () => new Set(queue.map((e) => e.op.bedId)),
    [queue]
  )

  return {
    pendingCount: queue.length,
    isDraining,
    drainErrors,
    queuedBedIds,
    enqueue,
    drainQueue,
    clearQueue,
  }
}
