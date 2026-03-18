// Shared fixtures for alert-screen-actions tests
import type { ErrorEvent } from '@/lib/server/error-store'
import { DEFAULT_ALERT_PREFERENCES } from '@/features/notifications/lib/default-alert-preferences'
import { getBedGridData } from '@/features/bed-dashboard/actions/bed-grid-actions'

export const SUPERVISOR_SESSION = { userId: 'sup-1', role: 'supervisor' }

export const DELAY_MS = DEFAULT_ALERT_PREFERENCES.thresholds.delayMinutes * 60 * 1000 + 1000
export const ESCALATION_MS = DEFAULT_ALERT_PREFERENCES.thresholds.escalationMinutes * 60 * 1000 + 1000

export function makeBedGridData(override: Partial<{
  elapsedTimeMs: number | null
  isDispositionBottleneck: boolean
  dispositionElapsedMs: number | null
  isEscalated: boolean
}> = {}) {
  const now = new Date()
  return {
    success: true,
    data: {
      beds: [{
        id: 'bed-1',
        bedNumber: 'ER-01',
        currentStage: { id: 's1', name: 'Triage', displayOrder: 1, colorCode: '#fff', description: null, isActive: true, createdAt: now, updatedAt: now },
        currentStageId: 's1',
        elapsedTimeMs: override.elapsedTimeMs ?? 0,
        isDelayed: (override.elapsedTimeMs ?? 0) > 0,
        isEscalated: override.isEscalated ?? false,
        isDispositionBottleneck: override.isDispositionBottleneck ?? false,
        dispositionElapsedMs: override.dispositionElapsedMs ?? null,
        dispositionDelayReason: null,
        dispositionDelayLogId: null,
        patientStartTime: now,
        lastStageChange: now,
        isOccupied: true,
        isActive: true,
        isTemporary: false,
        isVirtual: false,
        wardId: null,
        metadata: {},
        createdAt: now,
        updatedAt: now,
      }],
      stages: [],
      delayThresholdMs: DEFAULT_ALERT_PREFERENCES.thresholds.delayMinutes * 60 * 1000,
      escalationThresholdMs: DEFAULT_ALERT_PREFERENCES.thresholds.escalationMinutes * 60 * 1000,
      bottleneckCount: 0,
      escalationCount: 0,
    },
    error: undefined,
  } as unknown as Awaited<ReturnType<typeof getBedGridData>>
}

export const SYSTEM_ERROR: ErrorEvent = {
  id: 'err-1',
  level: 'ERROR',
  category: 'database',
  message: 'Connection pool exhausted',
  stack: undefined,
  context: {},
  acknowledged: false,
  created_at: new Date().toISOString(),
}
