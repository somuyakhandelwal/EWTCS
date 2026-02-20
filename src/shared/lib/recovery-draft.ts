interface RecoveryEnvelope<T> {
  version: number
  updatedAt: number
  data: T
}

interface RecoveryLogEntry {
  timestamp: number
  event: string
  context?: Record<string, unknown>
}

interface RecoveryOptions {
  version?: number
  maxAgeMs?: number
}

const DEFAULT_VERSION = 1
const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000
const RECOVERY_LOG_KEY = 'ewtcs:recovery-logs'
const MAX_RECOVERY_LOGS = 100

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function safeParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function saveRecoveryDraft<T>(key: string, data: T, options?: RecoveryOptions): void {
  if (!isBrowser()) return

  const envelope: RecoveryEnvelope<T> = {
    version: options?.version ?? DEFAULT_VERSION,
    updatedAt: Date.now(),
    data,
  }

  try {
    localStorage.setItem(key, JSON.stringify(envelope))
  } catch {
    // Storage unavailable or quota exceeded; fail safely.
  }
}

export function loadRecoveryDraft<T>(
  key: string,
  options?: RecoveryOptions
): RecoveryEnvelope<T> | null {
  if (!isBrowser()) return null

  const maxAgeMs = options?.maxAgeMs ?? DEFAULT_MAX_AGE_MS
  const version = options?.version ?? DEFAULT_VERSION

  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null

    const envelope = safeParse<RecoveryEnvelope<T>>(raw)
    if (!envelope) {
      localStorage.removeItem(key)
      return null
    }

    if (envelope.version !== version) {
      localStorage.removeItem(key)
      return null
    }

    if (Date.now() - envelope.updatedAt > maxAgeMs) {
      localStorage.removeItem(key)
      return null
    }

    return envelope
  } catch {
    return null
  }
}

export function clearRecoveryDraft(key: string): void {
  if (!isBrowser()) return

  try {
    localStorage.removeItem(key)
  } catch {
    // Ignore storage failures.
  }
}

export function appendRecoveryLog(event: string, context?: Record<string, unknown>): void {
  if (!isBrowser()) return

  try {
    const raw = localStorage.getItem(RECOVERY_LOG_KEY)
    const existing = raw ? safeParse<RecoveryLogEntry[]>(raw) ?? [] : []
    const next = [
      ...existing,
      { timestamp: Date.now(), event, context },
    ].slice(-MAX_RECOVERY_LOGS)
    localStorage.setItem(RECOVERY_LOG_KEY, JSON.stringify(next))
  } catch {
    // Ignore storage failures.
  }
}

export function getRecoveryLogs(): RecoveryLogEntry[] {
  if (!isBrowser()) return []

  try {
    const raw = localStorage.getItem(RECOVERY_LOG_KEY)
    if (!raw) return []
    return safeParse<RecoveryLogEntry[]>(raw) ?? []
  } catch {
    return []
  }
}

export function clearRecoveryLogs(): void {
  if (!isBrowser()) return

  try {
    localStorage.removeItem(RECOVERY_LOG_KEY)
  } catch {
    // Ignore storage failures.
  }
}