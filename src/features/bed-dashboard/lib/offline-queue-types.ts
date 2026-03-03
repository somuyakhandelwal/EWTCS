// Offline Queue Types
// US-16.1 + US-16.2: Types for the write-operation queue persisted to localStorage.
// US-16.3 + US-16.4: Drain result includes conflicts detected on reconnect.
// Extracted from useOfflineQueue to keep that hook under 200 lines.

import type { DispositionDelayReason } from '../types/bed'

// ─── Operation types ──────────────────────────────────────────────────────────

export type QueuedOperationType = 'stage-update' | 'discharge' | 'disposition-reason'

interface StageUpdateOperation {
  type: 'stage-update'
  bedId: string
  stageId: string
  /**
   * US-16.4: The stage the nurse saw when they queued the action.
   * Passed to the server for timestamp/state conflict detection.
   */
  expectedStageId?: string
  options?: { supervisorOverride: boolean; overrideReason?: string }
}

interface DischargeOperation {
  type: 'discharge'
  bedId: string
}

interface DispositionReasonOperation {
  type: 'disposition-reason'
  bedId: string
  reason: DispositionDelayReason
}

export type QueuedOperation =
  | StageUpdateOperation
  | DischargeOperation
  | DispositionReasonOperation

// ─── Queue entry ──────────────────────────────────────────────────────────────

export interface QueuedEntry {
  /** Unique entry id (used for deduplication and removal) */
  id: string
  /** ISO timestamp when enqueued */
  enqueuedAt: string
  op: QueuedOperation
}

// ─── Conflict types (US-16.4) ─────────────────────────────────────────────────

/** Server-side conflict info: the bed was already moved before the drain ran */
export interface ConflictInfo {
  /** Stage the bed is ACTUALLY in on the server right now */
  serverStageId: string
}

/** Links the original queued entry to the conflict reported by the server */
export interface ConflictItem {
  entry: QueuedEntry
  conflict: ConflictInfo
}

// ─── Drain API ────────────────────────────────────────────────────────────────

/** Handlers supplied by the caller when draining the queue */
export interface DrainHandlers {
  /**
   * US-16.4: Returns `{ success }` or `{ success: false, conflict }` when the
   * server detects the bed was already updated since the operation was queued.
   */
  onStageUpdate: (
    bedId: string,
    stageId: string,
    options?: { supervisorOverride: boolean; overrideReason?: string },
    expectedStageId?: string,
  ) => Promise<{ success: boolean; conflict?: ConflictInfo }>
  onDischarge: (bedId: string) => Promise<boolean>
  onDispositionReason: (bedId: string, reason: DispositionDelayReason) => Promise<boolean>
}

export interface DrainResult {
  succeeded: number
  failed: number
  errors: string[]
  /** US-16.4: operations where the server state had changed since queuing */
  conflicts: ConflictItem[]
}

// ─── Hook return ──────────────────────────────────────────────────────────────

export interface UseOfflineQueueReturn {
  /** Number of operations waiting to be synced */
  pendingCount: number
  /** True while a drain is in progress */
  isDraining: boolean
  /** Errors from the most recent drain (cleared on next drain start) */
  drainErrors: string[]
  /**
   * Set of bed IDs that have at least one queued write operation.
   * Used by BedCard to show an amber "pending sync" badge.
   */
  queuedBedIds: Set<string>
  /** Add an operation to the queue */
  enqueue: (op: QueuedOperation) => void
  /**
   * Execute all queued operations in FIFO order using the provided handlers.
   * Successfully executed operations are removed from the queue.
   * Failed operations remain in the queue for the next attempt.
   */
  drainQueue: (handlers: DrainHandlers) => Promise<DrainResult>
  /** Remove all queued operations (e.g. after logout) */
  clearQueue: () => void
}
