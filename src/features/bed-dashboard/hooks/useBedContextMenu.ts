'use client'

import { useState, useMemo, useCallback, type MouseEvent } from 'react'
import type { BedWithElapsedTime } from '../types/bed'
import { getValidTransitionsForBed } from '../actions/bed-grid-actions'

interface MenuState {
  bedId: string
  position: { x: number; y: number }
}

/**
 * Manages context-menu state for the bed grid: opening, loading
 * valid stage transitions from the server, and closing.
 */
export function useBedContextMenu(
  beds: BedWithElapsedTime[],
  onStageSelect?: (bedId: string, stageId: string) => void,
) {
  const [menuState, setMenuState] = useState<MenuState | null>(null)
  const [validNextStages, setValidNextStages] = useState<string[]>([])
  const [overrideRequiredStages, setOverrideRequiredStages] = useState<string[]>([])
  const [isLoadingTransitions, setIsLoadingTransitions] = useState(false)
  const [menuError, setMenuError] = useState<string | null>(null)

  const openMenuForBed = useCallback(
    async (bedId: string, position: { x: number; y: number }) => {
      // Clear previous data immediately to prevent "flash" of old bed's transitions
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
    [],
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
