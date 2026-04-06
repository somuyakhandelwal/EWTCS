'use client'

import { useState, useMemo, useCallback, type MouseEvent } from 'react'
import type { BedWithElapsedTime, StageTransitionMap } from '../types/bed'
import { getValidTransitionsForBed } from '../actions/bed-transition-actions'

interface MenuState {
  bedId: string
  position: { x: number; y: number }
}

/**
 * Manages context-menu state for the bed grid: opening, loading
 * valid stage transitions from the server, and closing.
 *
 * US-16.2: When `isOffline=true`, skips the server action and derives valid
 * transitions from the locally cached `stageTransitionMap` (bundled into
 * BedGridData at fetch time). This allows nurses to see and select stage
 * options while offline so their action can be queued for sync.
 */
export function useBedContextMenu(
  beds: BedWithElapsedTime[],
  onStageSelect?: (bedId: string, stageId: string) => void,
  isOffline = false,
  stageTransitionMap?: StageTransitionMap,
) {
  const [menuState, setMenuState] = useState<MenuState | null>(null)
  const [validNextStages, setValidNextStages] = useState<string[]>([])
  const [overrideRequiredStages, setOverrideRequiredStages] = useState<string[]>([])
  const [isLoadingTransitions, setIsLoadingTransitions] = useState(false)
  const [menuError, setMenuError] = useState<string | null>(null)

  const openMenuForBed = useCallback(
    async (bedId: string, position: { x: number; y: number }) => {
      const bed = beds.find(b => b.id === bedId)
      const fromKey = bed?.currentStageId ?? 'null'
      const cachedTransitions = stageTransitionMap?.[fromKey]

      // US-16.2: Offline — resolve transitions from cache synchronously so the menu
      // opens with ALL stage options visible immediately (no "Loading transitions…" flash).
      if (isOffline) {
        setMenuError(null)
        setMenuState({ bedId, position })
        if (cachedTransitions) {
          setValidNextStages(cachedTransitions.allowed ?? [])
          setOverrideRequiredStages(cachedTransitions.requiresOverride ?? [])
        } else {
          // Cached data predates this feature (old cache version).
          // Keep empty arrays; the existing menu logic handles offline fallback display.
          setValidNextStages([])
          setOverrideRequiredStages([])
        }
        return
      }

      // Online fast-path: when role-scoped transitions are already present in BedGridData,
      // render options immediately and skip the extra server call.
      if (cachedTransitions) {
        setMenuError(null)
        setMenuState({ bedId, position })
        setValidNextStages(cachedTransitions.allowed ?? [])
        setOverrideRequiredStages(cachedTransitions.requiresOverride ?? [])
        return
      }

      // Online — clear stale transitions from the previous bed first, then fetch from server.
      // setIsLoadingTransitions(true) causes BedStageContextMenu to show "Verifying access…"
      // instead of the empty-item spinner, matching the expected online loading UX.
      setValidNextStages([])
      setOverrideRequiredStages([])
      setMenuError(null)
      setMenuState({ bedId, position })
      setIsLoadingTransitions(true)
      try {
        const result = await getValidTransitionsForBed(bedId)
        if (result.success && result.allowed) {
          setValidNextStages(result.allowed)
          setOverrideRequiredStages(result.requiresOverride || [])
        } else {
          setMenuError(result.error || 'Unable to load available stages')
          setValidNextStages([])
          setOverrideRequiredStages([])
        }
      } catch {
        setMenuError('Connection error. Please try again.')
        setValidNextStages([])
        setOverrideRequiredStages([])
      } finally {
        setIsLoadingTransitions(false)
      }
    },
    [beds, isOffline, stageTransitionMap],
  )

  const handleOpenMenu = useCallback(
    async (event: MouseEvent<HTMLDivElement>, bed: BedWithElapsedTime) => {
      if (!onStageSelect) return
      event.preventDefault()
      await openMenuForBed(bed.id, { x: event.clientX, y: event.clientY })
    },
    [onStageSelect, openMenuForBed],
  )

  const handleBedTap = useCallback(
    async (bed: BedWithElapsedTime) => {
      if (!onStageSelect) return
      await openMenuForBed(bed.id, { x: window.innerWidth / 2 - 96, y: window.innerHeight / 2 })
    },
    [onStageSelect, openMenuForBed],
  )

  const handleCloseMenu = useCallback(() => {
    setMenuState(null)
    setValidNextStages([])
    setOverrideRequiredStages([])
    setMenuError(null)
  }, [])

  const activeBed = useMemo(() => {
    if (!menuState) return null
    return beds.find((bed) => bed.id === menuState.bedId) ?? null
  }, [beds, menuState])

  return {
    menuState,
    validNextStages,
    overrideRequiredStages,
    isLoadingTransitions,
    menuError,
    activeBed,
    handleOpenMenu,
    handleBedTap,
    handleCloseMenu,
  }
}
