'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  appendRecoveryLog,
  clearRecoveryDraft,
  loadRecoveryDraft,
  saveRecoveryDraft,
} from '@/shared/lib/recovery-draft'

interface UseRecoveryDraftFormOptions<T> {
  draftKey: string
  values: T
  baseline: T
  enabled?: boolean
  onRestore: (draft: T) => void
  restorePrompt: string
  restoredEvent: string
  rejectedEvent: string
  eventContext?: Record<string, unknown>
  version?: number
}

const DEFAULT_VERSION = 1

export function useRecoveryDraftForm<T>({
  draftKey,
  values,
  baseline,
  enabled = true,
  onRestore,
  restorePrompt,
  restoredEvent,
  rejectedEvent,
  eventContext,
  version = DEFAULT_VERSION,
}: UseRecoveryDraftFormOptions<T>) {
  const [restoredNotice, setRestoredNotice] = useState(false)
  const restoredKeyRef = useRef<string | null>(null)

  const isDirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(baseline),
    [baseline, values]
  )

  useEffect(() => {
    if (!enabled) return
    if (restoredKeyRef.current === draftKey) return
    restoredKeyRef.current = draftKey

    const restored = loadRecoveryDraft<T>(draftKey, { version })
    if (!restored || typeof window === 'undefined') return

    const shouldRestore = window.confirm(restorePrompt)
    if (!shouldRestore) {
      clearRecoveryDraft(draftKey)
      appendRecoveryLog(rejectedEvent, eventContext)
      return
    }

    onRestore(restored.data)
    setRestoredNotice(true)
    appendRecoveryLog(restoredEvent, eventContext)
  }, [draftKey, enabled, eventContext, onRestore, rejectedEvent, restorePrompt, restoredEvent, version])

  useEffect(() => {
    if (!enabled) return
    if (!isDirty) {
      clearRecoveryDraft(draftKey)
      return
    }
    saveRecoveryDraft(draftKey, values, { version })
  }, [draftKey, enabled, isDirty, values, version])

  return {
    restoredNotice,
    clearDraft: () => clearRecoveryDraft(draftKey),
  }
}