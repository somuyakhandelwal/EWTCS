'use client'

import { Button } from '@/shared/components/ui/button'
import type { HelpTourStep } from '@/features/help/types/help'

interface HelpTourOverlayProps {
  step: HelpTourStep | null
  rect: DOMRect | null
  index: number
  total: number
  onClose: () => void
  onNext: () => void
  onPrev: () => void
}

export function HelpTourOverlay({
  step,
  rect,
  index,
  total,
  onClose,
  onNext,
  onPrev,
}: HelpTourOverlayProps) {
  if (!step || !rect) return null

  const top = Math.max(16, rect.bottom + 12)
  const left = Math.max(12, rect.left)

  return (
    <>
      <div className="fixed inset-0 z-[78] bg-background/40" onClick={onClose} aria-hidden="true" />
      <div
        className="fixed z-[79] border-2 border-primary rounded-lg pointer-events-none"
        style={{
          left: rect.left - 4,
          top: rect.top - 4,
          width: rect.width + 8,
          height: rect.height + 8,
        }}
      />
      <div
        className="fixed z-[80] w-80 max-w-[calc(100vw-1.5rem)] rounded-lg border border-border bg-card p-4 shadow-lg"
        style={{ top, left }}
        role="dialog"
        aria-label="Guided tour step"
      >
        <p className="text-xs text-muted-foreground mb-1">Step {index + 1} of {total}</p>
        <h3 className="text-sm font-semibold text-card-foreground">{step.title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <Button size="sm" variant="outline" onClick={onPrev} disabled={index === 0} title="Previous tour step">
            Previous
          </Button>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onClose} title="End guided tour">
              End Tour
            </Button>
            <Button size="sm" onClick={onNext} title="Next tour step">
              {index === total - 1 ? 'Finish' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
