import type { QueuedEntry, QueuedOperation } from '../lib/offline-queue-types'

const OFFLINE_QUEUE_ENDPOINT = '/api/offline-queue'

type DbQueueApiRow = {
  id: string
  client_operation_id: string
  payload: unknown
  enqueued_at: string
  error_message?: string | null
}

export function isQueuedOperation(value: unknown): value is QueuedOperation {
  if (!value || typeof value !== 'object') return false
  const maybe = value as { type?: unknown; bedId?: unknown }
  if (typeof maybe.type !== 'string' || typeof maybe.bedId !== 'string') return false
  return ['stage-update', 'discharge', 'disposition-reason'].includes(maybe.type)
}

export async function persistToDb(entry: QueuedEntry): Promise<string | null> {
  if (typeof fetch !== 'function') return null
  try {
    const response = await fetch(OFFLINE_QUEUE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        localId: entry.id,
        clientOperationId: entry.clientOperationId,
        operationType: entry.op.type,
        payload: entry.op,
        enqueuedAt: entry.enqueuedAt,
      }),
    })
    if (!response.ok) return null
    const data = await response.json() as { id?: unknown }
    return typeof data.id === 'string' ? data.id : null
  } catch {
    return null
  }
}

export async function fetchDbPendingQueue(): Promise<QueuedEntry[]> {
  if (typeof fetch !== 'function') return []
  try {
    const response = await fetch(`${OFFLINE_QUEUE_ENDPOINT}?mode=pending&limit=500`, {
      cache: 'no-store',
    })
    if (!response.ok) return []

    const data = await response.json() as { entries?: unknown[] }
    if (!Array.isArray(data.entries)) return []

    return data.entries.flatMap((row) => {
      const r = row as DbQueueApiRow
      if (!r?.id || !isQueuedOperation(r.payload) || typeof r.enqueued_at !== 'string') {
        return []
      }

      const clientOperationId = typeof r.client_operation_id === 'string' && r.client_operation_id
        ? r.client_operation_id
        : `db-${r.id}`

      return [{
        id: clientOperationId,
        clientOperationId,
        dbId: r.id,
        dbSynced: true,
        syncError: r.error_message ?? null,
        enqueuedAt: r.enqueued_at,
        op: r.payload,
      } satisfies QueuedEntry]
    })
  } catch {
    return []
  }
}

export async function patchDbStatus(
  dbId: string,
  status: 'drained' | 'failed',
  errorMessage?: string,
): Promise<void> {
  if (typeof fetch !== 'function') return
  try {
    await fetch(OFFLINE_QUEUE_ENDPOINT, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: dbId, status, errorMessage }),
    })
  } catch {
    // Best-effort only. Local queue still governs retry visibility.
  }
}
