import type { DrainResult, UseOfflineQueueReturn } from '../lib/offline-queue-types'

type ExecuteOfflineResponse = {
  success: boolean
  error?: string
  conflict?: { serverStageId: string }
}

async function executeOfflineOperation(payload: unknown): Promise<ExecuteOfflineResponse> {
  const response = await fetch('/api/offline-sync/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  const result = (await response.json()) as ExecuteOfflineResponse
  if (!response.ok) {
    return { success: false, error: result.error || 'Failed to execute offline operation' }
  }
  return result
}

interface RunOfflineDrainParams {
  drainQueue: UseOfflineQueueReturn['drainQueue']
  realtimeRefresh: () => Promise<void>
  onSyncComplete?: (result: DrainResult) => void
}

export function runOfflineDrain({
  drainQueue,
  realtimeRefresh,
  onSyncComplete,
}: RunOfflineDrainParams): Promise<void> {
  return drainQueue({
    onStageUpdate: async (bedId, stageId, options, expectedStageId) => {
      const result = await executeOfflineOperation({
        type: 'stage-update',
        bedId,
        stageId,
        expectedStageId,
        options: {
          supervisorOverride: options?.supervisorOverride ?? false,
          overrideReason: options?.overrideReason,
        },
      })
      if (result.conflict) {
        return { success: false, conflict: { serverStageId: result.conflict.serverStageId } }
      }
      return { success: result.success }
    },
    onDischarge: async (bedId) => {
      const result = await executeOfflineOperation({ type: 'discharge', bedId })
      return result.success
    },
    onDispositionReason: async (bedId, reason) => {
      const result = await executeOfflineOperation({ type: 'disposition-reason', bedId, reason })
      return result.success
    },
  })
    .then((drainResult) => {
      realtimeRefresh()
      onSyncComplete?.(drainResult)
    })
    .catch(() => {})
}
