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
import {
  fetchDbPendingQueue,
  patchDbStatus,
  persistToDb,
} from './offline-queue-persistence'
import {
  clearQueueStorage,
  generateQueueId,
  readQueueFromStorage,
  writeQueueToStorage,
} from './offline-queue-storage'
export type {
  QueuedOperationType,
  QueuedOperation,
  QueuedEntry,
  DrainHandlers,
  DrainResult,
  UseOfflineQueueReturn,
} from '../lib/offline-queue-types'

export function useOfflineQueue(): UseOfflineQueueReturn {
  // Hydrate from storage on first render
  const [queue, setQueue] = useState<QueuedEntry[]>(() => readQueueFromStorage())
  const [isDraining, setIsDraining] = useState(false)
  const [drainErrors, setDrainErrors] = useState<string[]>([])
  // Guard against concurrent drain calls
  const isDrainingRef = useRef(false)

  const enqueue = useCallback((op: QueuedOperation) => {
    const entry: QueuedEntry = {
      id: generateQueueId(),
      clientOperationId: '',
      enqueuedAt: new Date().toISOString(),
      op,
    }
    entry.clientOperationId = entry.id
    setQueue((prev) => {
      const next = [...prev, entry]
      writeQueueToStorage(next)
      return next
    })

    // Fire-and-forget durability write. localStorage remains the fast path.
    void persistToDb(entry).then((dbId) => {
      const storageQueue = readQueueFromStorage()
      const next = storageQueue.map((e) =>
        e.id === entry.id
          ? { ...e, dbId: dbId ?? undefined, dbSynced: Boolean(dbId), syncError: dbId ? null : 'db_sync_failed' }
          : e
      )
      writeQueueToStorage(next)
    })
  }, [])

  const drainQueue = useCallback(async (handlers: DrainHandlers): Promise<DrainResult> => {
    if (isDrainingRef.current) {
      return { succeeded: 0, failed: 0, errors: ['Drain already in progress'], conflicts: [] }
    }

    isDrainingRef.current = true
    setIsDraining(true)
    setDrainErrors([])

    // Snapshot local queue and merge with pending DB queue.
    const localSnapshot = readQueueFromStorage()
    const dbSnapshot = await fetchDbPendingQueue()
    const dbClientIds = new Set(dbSnapshot.map((entry) => entry.clientOperationId))
    const localOnly = localSnapshot.filter((entry) => !dbClientIds.has(entry.clientOperationId || entry.id))
    const snapshot = [...dbSnapshot, ...localOnly].sort(
      (a, b) => new Date(a.enqueuedAt).getTime() - new Date(b.enqueuedAt).getTime()
    )

    const errors: string[] = []
    const succeededIds: string[] = []

    const conflicts: import('../lib/offline-queue-types').ConflictItem[] = []
    const conflictedIds: string[] = []

    for (const snapshotEntry of snapshot) {
      const entry = { ...snapshotEntry }

      try {
        if (!entry.dbId) {
          const dbId = await persistToDb(entry)
          if (dbId) entry.dbId = dbId
        }

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
            if (entry.dbId) {
              await patchDbStatus(
                entry.dbId,
                'failed',
                `Conflict: server stage is ${stageResult.conflict.serverStageId}`
              )
            }
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
          if (entry.dbId) {
            await patchDbStatus(entry.dbId, 'drained')
          }
        } else {
          errors.push(`[${entry.op.type}] bed=${entry.op.bedId}: server returned failure`)
          if (entry.dbId) {
            await patchDbStatus(entry.dbId, 'failed', 'Server returned failure')
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`[${entry.op.type}] bed=${entry.op.bedId}: ${msg}`)
        if (entry.dbId) {
          await patchDbStatus(entry.dbId, 'failed', msg)
        }
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
