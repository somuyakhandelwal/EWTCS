'use client'
// US-6.3: Global Delay Threshold configuration form (AC-1, AC-2, AC-4, AC-5)

import { useCallback, useEffect, useRef, useState } from 'react'
import { setGlobalThresholdAction } from '@/shared/actions/settings-actions'
import { isTransientError, retryAsync } from '@/shared/lib/retry'
import {
  appendRecoveryLog,
  clearRecoveryDraft,
  loadRecoveryDraft,
  saveRecoveryDraft,
} from '@/shared/lib/recovery-draft'

const AUTOSAVE_DEBOUNCE_MS = 500
const AUTOSAVE_RETRIES = 2
const DRAFT_KEY = 'ewtcs:global-threshold-draft'
const DRAFT_VERSION = 1

interface GlobalThresholdFormProps {
  initialMinutes: number
}

export function GlobalThresholdForm({ initialMinutes }: GlobalThresholdFormProps) {
  const [hours, setHours] = useState(Math.floor(initialMinutes / 60))
  const [minutes, setMinutes] = useState(initialMinutes % 60)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [restoredNotice, setRestoredNotice] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'retrying' | 'failed'>('idle')
  const isInitialized = useRef(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const totalMinutes = hours * 60 + minutes
  const preview =
    hours > 0 && minutes > 0
      ? `${hours}h ${minutes}min`
      : hours > 0
      ? `${hours} hour${hours !== 1 ? 's' : ''}`
      : `${minutes} minutes`

  const handleSave = useCallback(async () => {
    if (totalMinutes < 30) {
      setError('Threshold must be at least 30 minutes')
      setSaveState('failed')
      return
    }
    setError('')
    setSaved(false)

    try {
      await retryAsync(async attempt => {
        setSaveState(attempt > 1 ? 'retrying' : 'saving')
        const res = await setGlobalThresholdAction({ hours, minutes })
        if (!res.success) throw new Error(res.error ?? 'Failed to save')
      }, {
        retries: AUTOSAVE_RETRIES,
        shouldRetry: isTransientError,
      })

      setSaveState('idle')
      setSaved(true)
      clearRecoveryDraft(DRAFT_KEY)
      appendRecoveryLog('global_threshold_saved')
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaved(false), 2500)
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to save'
      setError(message)
      setSaveState('failed')
      appendRecoveryLog('global_threshold_save_failed', { totalMinutes })
      if (typeof window !== 'undefined' && isTransientError(saveError)) {
        window.alert('Auto-save failed after retries. Please retry your threshold change.')
      }
    }
  }, [hours, minutes, totalMinutes])

  useEffect(() => {
    const restored = loadRecoveryDraft<{ hours: number; minutes: number }>(DRAFT_KEY, {
      version: DRAFT_VERSION,
    })
    if (!restored || typeof window === 'undefined') return

    const shouldRestore = window.confirm('Unsaved threshold changes were found. Restore them now?')
    if (!shouldRestore) {
      clearRecoveryDraft(DRAFT_KEY)
      appendRecoveryLog('global_threshold_restore_rejected')
      return
    }

    setHours(restored.data.hours)
    setMinutes(restored.data.minutes)
    setRestoredNotice(true)
    appendRecoveryLog('global_threshold_restored')
  }, [])

  useEffect(() => {
    const isDirty = hours !== Math.floor(initialMinutes / 60) || minutes !== initialMinutes % 60
    if (!isDirty) {
      clearRecoveryDraft(DRAFT_KEY)
      return
    }
    saveRecoveryDraft(DRAFT_KEY, { hours, minutes }, { version: DRAFT_VERSION })
  }, [hours, initialMinutes, minutes])

  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true
      return
    }
    const timer = setTimeout(() => {
      void handleSave()
    }, AUTOSAVE_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [hours, minutes, handleSave])

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  return (
    <div className='p-4 rounded-lg border-2 border-blue-200 bg-blue-50 mb-6'>
      <h2 className='text-lg font-bold text-gray-900 mb-1'>Global Delay Threshold</h2>
      <p className='text-sm text-gray-500 mb-4'>
        Beds exceeding this time are flagged as delayed. Individual stages can override this.
      </p>

      <div className='flex items-end gap-4 flex-wrap'>
        <div>
          <label className='block text-xs font-semibold text-gray-700 mb-1'>Hours</label>
          <input
            type='number'
            min={0}
            max={24}
            value={hours}
            onChange={e => { setHours(Math.max(0, Math.min(24, Number(e.target.value)))); setSaved(false); setSaveState('idle') }}
            className='w-20 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>
        <div>
          <label className='block text-xs font-semibold text-gray-700 mb-1'>Minutes</label>
          <input
            type='number'
            min={0}
            max={59}
            value={minutes}
            onChange={e => { setMinutes(Math.max(0, Math.min(59, Number(e.target.value)))); setSaved(false); setSaveState('idle') }}
            className='w-20 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>
        <div className='flex-1 min-w-[120px]'>
          <p className='text-xs text-gray-500 mb-1'>Preview</p>
          <p className={`font-semibold ${totalMinutes < 30 ? 'text-red-600' : 'text-blue-700'}`}>
            {preview}
          </p>
        </div>
        {saveState === 'saving' && <p className='text-xs text-blue-700'>Saving…</p>}
        {saveState === 'retrying' && <p className='text-xs text-amber-700'>Retrying save…</p>}
      </div>

      {error && <p className='text-red-600 text-sm mt-2'>{error}</p>}
      {restoredNotice && <p className='text-emerald-700 text-sm mt-2'>Recovered unsaved changes from previous session.</p>}
      {saved && <p className='text-green-600 text-sm mt-2'>✓ Threshold updated — applies immediately</p>}
    </div>
  )
}
