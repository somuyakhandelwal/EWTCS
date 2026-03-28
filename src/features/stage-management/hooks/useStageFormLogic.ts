'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Stage } from '../types/stage.types'
import { createStage, updateStage } from '../actions/stage-actions'
import { isTransientError, retryAsync } from '@/shared/lib/retry'
import {
  appendRecoveryLog,
  clearRecoveryDraft,
  loadRecoveryDraft,
} from '@/shared/lib/recovery-draft'
import { clearStageDraft, loadStageDraft, saveStageDraft } from '../actions/stage-draft-actions'

const SAVE_RETRIES = 2
const DRAFT_VERSION = 1
const DRAFT_DEBOUNCE_MS = 500
const CURRENT_USER = '__current__'

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
  saveStage: () => Promise<void>
}

export type OnSavedCallback = (s: Stage) => void

export function useStageFormLogic({
  stage,
  onSaved,
}: {
  stage?: Stage
  onSaved: OnSavedCallback
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
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draftKey = stage ? `ewtcs:stage-form-draft:${stage.id}` : 'ewtcs:stage-form-draft:new'
  const stageDraftId = stage?.id ?? 'new'

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

  const saveStage = useCallback(async () => {
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
        }, { retries: SAVE_RETRIES, shouldRetry: isTransientError })

        onSaved({ ...stage, name, color_code: color, description: desc,
          threshold_minutes: totalThresholdMins })
        clearRecoveryDraft(draftKey)
        void clearStageDraft(CURRENT_USER, stageDraftId).catch(() => {
          appendRecoveryLog('stage_form_draft_clear_failed', { stageId: stageDraftId })
        })
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
        void clearStageDraft(CURRENT_USER, stageDraftId).catch(() => {
          appendRecoveryLog('stage_form_draft_clear_failed', { stageId: stageDraftId })
        })
        appendRecoveryLog('stage_form_saved', { stageId: 'new' })
        setSaveState('saved')
      }
    } catch (e: unknown) {
      setSaveState('failed')
      setError(e instanceof Error ? e.message : 'Something went wrong')
      appendRecoveryLog('stage_form_save_failed', { stageId: stage?.id ?? 'new' })
    } finally { setLoading(false) }
  }, [color, desc, draftKey, getThresholdMinutes, name, onSaved, stage, stageDraftId, validateInput])

  useEffect(() => {
    let cancelled = false

    const restoreDraft = async () => {
      let nextDraft: StageFormDraft | null = null
      try {
        const serverDraft = await loadStageDraft(CURRENT_USER, stageDraftId)
        if (serverDraft && typeof serverDraft === 'object') {
          nextDraft = serverDraft as StageFormDraft
        }
      } catch {
        appendRecoveryLog('stage_form_db_draft_load_failed', { stageId: stageDraftId })
      }

      if (!nextDraft) {
        const localDraft = loadRecoveryDraft<StageFormDraft>(draftKey, { version: DRAFT_VERSION })
        nextDraft = localDraft?.data ?? null
      }

      if (!nextDraft || cancelled || typeof window === 'undefined') return
      const shouldRestore = window.confirm('Unsaved stage form changes were found. Restore them now?')
      if (!shouldRestore) {
        clearRecoveryDraft(draftKey)
        void clearStageDraft(CURRENT_USER, stageDraftId).catch(() => {
          appendRecoveryLog('stage_form_draft_clear_failed', { stageId: stageDraftId })
        })
        appendRecoveryLog('stage_form_restore_rejected', { stageId: stage?.id ?? 'new' })
        return
      }

      setName(nextDraft.name); setColor(nextDraft.color); setDesc(nextDraft.desc)
      setThresholdHours(nextDraft.thresholdHours); setThresholdMins(nextDraft.thresholdMins)
      setRestoredNotice(true)
      appendRecoveryLog('stage_form_restored', { stageId: stage?.id ?? 'new' })
    }

    void restoreDraft()
    return () => { cancelled = true }
  }, [draftKey, stage?.id, stageDraftId])

  useEffect(() => {
    const baseline: StageFormDraft = {
      name: stage?.name ?? '',
      color: normalizeStageColor(stage?.color_code) ?? 'blue',
      desc: stage?.description ?? '',
      thresholdHours: stageThresholdMins ? Math.floor(stageThresholdMins / 60) : '',
      thresholdMins: stageThresholdMins ? stageThresholdMins % 60 : '',
    }
    const current: StageFormDraft = { name, color, desc, thresholdHours, thresholdMins }

    if (draftSaveTimerRef.current) {
      clearTimeout(draftSaveTimerRef.current)
      draftSaveTimerRef.current = null
    }

    if (JSON.stringify(baseline) !== JSON.stringify(current)) {
      draftSaveTimerRef.current = setTimeout(() => {
        void saveStageDraft(CURRENT_USER, stageDraftId, current).catch(() => {
          appendRecoveryLog('stage_form_draft_save_failed', { stageId: stageDraftId })
        })
      }, DRAFT_DEBOUNCE_MS)
    } else {
      clearRecoveryDraft(draftKey)
      void clearStageDraft(CURRENT_USER, stageDraftId).catch(() => {
        appendRecoveryLog('stage_form_draft_clear_failed', { stageId: stageDraftId })
      })
    }

    return () => {
      if (draftSaveTimerRef.current) {
        clearTimeout(draftSaveTimerRef.current)
        draftSaveTimerRef.current = null
      }
    }
  }, [color, desc, draftKey, name, stage?.color_code, stage?.description,
      stage?.name, stageDraftId, stageThresholdMins, thresholdHours, thresholdMins])

  useEffect(() => () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current)
  }, [])

  return {
    name, setName, color, setColor, desc, setDesc,
    thresholdHours, setThresholdHours, thresholdMins, setThresholdMins,
    stageThresholdMins, error, loading, saveState, restoredNotice, saveStage,
  }
}
