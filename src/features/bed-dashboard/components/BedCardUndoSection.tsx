// BedCardUndoSection
// US-2.1: Undo button shown for 30 s after a stage update.
// Extracted from BedCard to keep that component under 200 lines.

interface BedCardUndoSectionProps {
  /** Whether to render the section at all */
  show: boolean
  onUndo: () => void
  /** True while the undo API call is in-flight */
  isUndoing: boolean
  /** Seconds remaining in the 30 s undo window */
  timerSeconds: number
}

/**
 * Undo button with countdown timer shown below the stage name on a BedCard.
 * Stops propagation so clicking the button doesn't re-trigger the card action.
 */
export function BedCardUndoSection({ show, onUndo, isUndoing, timerSeconds }: BedCardUndoSectionProps) {
  if (!show) return null

  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        className="px-3 py-1 bg-primary hover:opacity-90 text-primary-foreground text-xs rounded transition-colors font-semibold shadow focus:ring-2 focus:ring-ring focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={e => { e.stopPropagation(); onUndo() }}
        disabled={isUndoing}
        aria-label={isUndoing ? 'Undoing…' : `Undo last action (expires in ${timerSeconds} seconds)`}
      >
        {isUndoing ? 'Undoing…' : 'Undo'}
      </button>
      {!isUndoing && (
        <span className="text-xs text-muted-foreground" aria-hidden="true">({timerSeconds}s)</span>
      )}
    </div>
  )
}
