'use client'

import { useEffect, useMemo, useState } from 'react'
import { useHelpState } from '@/features/help/hooks/useHelpState'
import { HelpPanel } from '@/features/help/components/HelpPanel'
import { HelpTourOverlay } from '@/features/help/components/HelpTourOverlay'
import { HelpTriggerButton } from '@/features/help/components/HelpTriggerButton'
import { trackHelpEvent } from '@/features/help/lib/help-telemetry'
import { HELP_CONTEXTS } from '@/features/help/lib/help-content'
import type { CrossPageGroup, HelpTourStep } from '@/features/help/types/help'

function useTourTarget(step: HelpTourStep | null, enabled: boolean) {
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (!enabled || !step) {
      setRect(null)
      return
    }

    const readRect = () => {
      const node = document.querySelector(step.selector)
      if (!node) {
        setRect(null)
        return
      }
      node.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setRect(node.getBoundingClientRect())
    }

    readRect()
    window.addEventListener('resize', readRect)
    window.addEventListener('scroll', readRect, true)

    return () => {
      window.removeEventListener('resize', readRect)
      window.removeEventListener('scroll', readRect, true)
    }
  }, [enabled, step])

  return rect
}

export function GlobalHelp() {
  const { context, isOpen, openHelp, closeHelp, toggleHelp } = useHelpState()
  const [search, setSearch] = useState('')
  const [tourIndex, setTourIndex] = useState(0)
  const [tourRunning, setTourRunning] = useState(false)

  useEffect(() => {
    setSearch('')
    setTourIndex(0)
    setTourRunning(false)
  }, [context.routeKey])

  useEffect(() => {
    void trackHelpEvent({ eventType: isOpen ? 'open' : 'close', routeKey: context.routeKey })
  }, [context.routeKey, isOpen])

  useEffect(() => {
    if (!isOpen || search.trim().length < 2) return
    const timer = window.setTimeout(() => {
      void trackHelpEvent({
        eventType: 'search',
        routeKey: context.routeKey,
        query: search.trim().slice(0, 120),
      })
    }, 350)

    return () => window.clearTimeout(timer)
  }, [context.routeKey, isOpen, search])

  // Gap 4 — F1 keyboard shortcut to toggle the help panel
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'F1') {
        event.preventDefault()
        toggleHelp()
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [toggleHelp])

  // Gap 6 — Search across all pages when query is ≥ 2 chars
  const crossPageResults = useMemo<CrossPageGroup[] | null>(() => {
    const q = search.trim().toLowerCase()
    if (q.length < 2) return null
    const groups = HELP_CONTEXTS.flatMap((ctx) => {
      const matched = ctx.tips.filter((tip) =>
        `${tip.title} ${tip.description}`.toLowerCase().includes(q)
      )
      return matched.length > 0
        ? [{ pageTitle: ctx.pageTitle, routeKey: ctx.routeKey, tips: matched }]
        : []
    })
    return groups.length > 0 ? groups : null
  }, [search])

  const activeStep = useMemo(
    () => (tourRunning ? context.tour[tourIndex] ?? null : null),
    [context.tour, tourIndex, tourRunning]
  )

  const targetRect = useTourTarget(activeStep, tourRunning)

  const startTour = () => {
    setTourIndex(0)
    setTourRunning(true)
    openHelp()
    void trackHelpEvent({ eventType: 'start_tour', routeKey: context.routeKey })
  }

  const stopTour = () => {
    if (tourRunning) {
      void trackHelpEvent({ eventType: 'finish_tour', routeKey: context.routeKey })
    }
    setTourRunning(false)
    setTourIndex(0)
  }

  const nextTourStep = () => {
    if (tourIndex >= context.tour.length - 1) {
      stopTour()
      return
    }
    setTourIndex((prev) => prev + 1)
  }

  const previousTourStep = () => {
    setTourIndex((prev) => Math.max(0, prev - 1))
  }

  return (
    <>
      <HelpPanel
        isOpen={isOpen}
        search={search}
        context={context}
        onSearchChange={setSearch}
        onClose={closeHelp}
        onStartTour={startTour}
        tourAvailable={context.tour.length > 0}
        crossPageResults={crossPageResults}
      />

      {tourRunning && !targetRect && (
        <div className="fixed z-[80] bottom-20 right-5 w-[22rem] rounded-lg border border-border bg-card p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">Tour step is not visible on this screen.</p>
          <p className="text-xs text-muted-foreground mt-1">Try navigating to the page section and start tour again.</p>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={stopTour}
              className="text-xs text-primary underline-offset-2 hover:underline"
              title="Close guided tour"
            >
              Close tour
            </button>
          </div>
        </div>
      )}

      {tourRunning && targetRect && (
        <HelpTourOverlay
          step={activeStep}
          rect={targetRect}
          index={tourIndex}
          total={context.tour.length}
          onClose={stopTour}
          onNext={nextTourStep}
          onPrev={previousTourStep}
        />
      )}

      <HelpTriggerButton isOpen={isOpen} onClick={toggleHelp} />
    </>
  )
}
