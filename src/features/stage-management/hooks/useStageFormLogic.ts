'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Stage } from '../types/stage.types'
import { createStage, updateStage } from '../actions/stage-actions'
import { isTransientError, retryAsync } from '@/shared/lib/retry'
import {
  appendRecoveryLog,
  clearRecoveryDraft,
  loadRecoveryDraft,
  saveRecoveryDraft,
} from '@/shared/lib/recovery-draft'

const AUTOSAVE_DEBOUNCE_MS = 500
const AUTOSAVE_RETRIES = 2
const DRAFT_VERSION = 1

const normalizeStageColor = (value?: string) =>
  value?.toLowerCase() === 'grey' ? 'gray' : value

interface StageFormDraft {
  name: string
  color: string
  desc: string
  thresholdHours: number | ''
  thresholdMins: number | ''
}

type SaveState = 'idle' | 'saving' | 'retrying' | 'saved' | 'failed'

export interface StageFormLogic {
  name: string
  setName: (v: string) => void
  color: string
  setColor: (v: string) => void
  desc: string
  setDesc: (v: string) => void
  thresholdHours: number | ''
  setThresholdHours: (v: number | '') => void
  thresholdMins: number | ''
  setThresholdMins: (v: number | '') => void
  stageThresholdMins: number | null
  error: string
  loading: boolean
  saveState: SaveState
  restoredNotice: boolean
  saveStage: (fromAutosave?: boolean) => Promise<void>
}

export function useStageFormLogic({
  stage,
  onSaved,
}: {
  stage?: Stage
  onSaved: (s: Stage) => void
}): StageFormLogic {
  const stageThresholdMins = stage?.threshold_minutes ?? null
  const [name, setName] = useState(stage?.name ?? '')
  const [color, setColor] = useState(normalizeStageColor(stage?.color_code) ?? 'blue')
  const [desc, setDesc] = useState(stage?.description ?? '')
  const [thresholdHours, setThresholdHours] = useState<number | ''>(
    stageThresholdMins ? Math.floor(stageThresholdMins / 60) : ''
  )
  const [thresholdMins, setThresholdMins] = useState<number | ''>(
    stageThresholdMins ? stageThresholdMins % 60 : ''
  )
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [restoredNotice, setRestoredNotice] = useState(false)
  const isInitialized = useRef(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draftKey = stage ? `ewtcs:stage-form-draft:${stage.id}` : 'ewtcs:stage-form-draft:new'

  const validateInput = useCallback(() => {
    if (!name.trim()) return 'Stage name is required'
    if (name.length > 50) return 'Name must be max 50 characters'
    const thH = Number(thresholdHours)
    const thM = Number(thresholdMins)
    const hasThreshold = thresholdHours !== '' || thresholdMins !== ''
    const total = hasThreshold ? thH * 60 + thM : null
    if (hasThreshold && (total ?? 0) < 30) return 'Stage threshold must be at least 30 minutes'
    return null
  }, [name, thresholdHours, thresholdMins])

  const getThresholdMinutes = useCallback(() => {
    const hasThreshold = thresholdHours !== '' || thresholdMins !== ''
    return hasThreshold ? Number(thresholdHours) * 60 + Number(thresholdMins) : null
  }, [thresholdHours, thresholdMins])

  const saveStage = useCallback(async (fromAutosave = false) => {
    const validationError = validateInput()
    if (validationError) { setError(validationError); setSaveState('failed'); return }

    const totalThresholdMins = getThresholdMinutes()
    setLoading(true); setError('')

    try {
      if (stage) {
        await retryAsync(async attempt => {
          setSaveState(attempt > 1 ? 'retrying' : 'saving')
          await updateStage({ id: stage.id, name, color_code: color, description: desc,
            threshold_minutes: totalThresholdMins })
        }, { retries: AUTOSAVE_RETRIES, shouldRetry: isTransientError })

        onSaved({ ...stage, name, color_code: color, description: desc,
          threshold_minutes: totalThresholdMins })
        clearRecoveryDraft(draftKey)
        appendRecoveryLog('stage_form_saved', { stageId: stage.id })
        setSaveState('saved')
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
        savedTimerRef.current = setTimeout(() => setSaveState('idle'), 1800)
      } else {
        await createStage({ name, color_code: color, description: desc })
        onSaved({ id: Date.now().toString(), name, color_code: color, description: desc,
          display_order: 99, is_default: false, is_active: true,
          threshold_minutes: null, created_at: '', updated_at: '' })
        clearRecoveryDraft(draftKey)
        appendRecoveryLog('stage_form_saved', { stageId: 'new' })
        setSaveState('saved')
      }
    } catch (e: unknown) {
      setSaveState('failed')
      setError(e instanceof Error ? e.message : 'Something went wrong')
      appendRecoveryLog('stage_form_save_failed', { stageId: stage?.id ?? 'new', fromAutosave })
      if (fromAutosave && typeof window !== 'undefined' && isTransientError(e)) {
        window.alert('Auto-save failed after retries. Please try again.')
      }
    } finally { setLoading(false) }
  }, [color, desc, draftKey, getThresholdMinutes, name, onSaved, stage, validateInput])

  // Restore draft on mount
  useEffect(() => {
    const restored = loadRecoveryDraft<StageFormDraft>(draftKey, { version: DRAFT_VERSION })
    if (!restored || typeof window === 'undefined') return
    const shouldRestore = window.confirm('Unsaved stage form changes were found. Restore them now?')
    if (!shouldRestore) {
      clearRecoveryDraft(draftKey)
      appendRecoveryLog('stage_form_restore_rejected', { stageId: stage?.id ?? 'new' })
      return
    }
    setName(restored.data.name); setColor(restored.data.color); setDesc(restored.data.desc)
    setThresholdHours(restored.data.thresholdHours); setThresholdMins(restored.data.thresholdMins)
    setRestoredNotice(true)
    appendRecoveryLog('stage_form_restored', { stageId: stage?.id ?? 'new' })
  }, [draftKey, stage?.id])

  // Persist dirty drafts to localStorage
  useEffect(() => {
    const baseline: StageFormDraft = {
      name: stage?.name ?? '',
      color: normalizeStageColor(stage?.color_code) ?? 'blue',
      desc: stage?.description ?? '',
      thresholdHours: stageThresholdMins ? Math.floor(stageThresholdMins / 60) : '',
      thresholdMins: stageThresholdMins ? stageThresholdMins % 60 : '',
    }
    const current: StageFormDraft = { name, color, desc, thresholdHours, thresholdMins }
    if (JSON.stringify(baseline) !== JSON.stringify(current)) {
      saveRecoveryDraft(draftKey, current, { version: DRAFT_VERSION })
    } else {
      clearRecoveryDraft(draftKey)
    }
  }, [color, desc, draftKey, name, stage?.color_code, stage?.description,
      stage?.name, stageThresholdMins, thresholdHours, thresholdMins])

  // Autosave debounce for edits
  useEffect(() => {
    if (!stage) return
    if (!isInitialized.current) { isInitialized.current = true; return }
    const timer = setTimeout(() => { void saveStage(true) }, AUTOSAVE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [stage, name, color, desc, thresholdHours, thresholdMins, saveStage])

  // Cleanup timers on unmount
  useEffect(() => () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current) }, [])

  return {
    name, setName, color, setColor, desc, setDesc,
    thresholdHours, setThresholdHours, thresholdMins, setThresholdMins,
    stageThresholdMins, error, loading, saveState, restoredNotice, saveStage,
  }
}
