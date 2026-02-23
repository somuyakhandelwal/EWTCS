import { Hourglass } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { formatElapsedTime } from '../lib/utils'
import type { DispositionDelayReason } from '../types/bed'
import { DISPOSITION_DELAY_REASON_LABELS } from '../types/bed'

const REASON_OPTIONS = Object.entries(DISPOSITION_DELAY_REASON_LABELS) as [
  DispositionDelayReason,
  string,
][]

interface BedBottleneckInfoProps {
  bedId: string
  dispositionElapsedMs?: number | null
  dispositionDelayReason?: DispositionDelayReason | null
  onReasonSelect?: (bedId: string, reason: DispositionDelayReason) => void
}

/** Renders the US-1.6 bottleneck badge and US-1.7 reason selector for a bed card. */
export function BedBottleneckInfo({
  bedId,
  dispositionElapsedMs,
  dispositionDelayReason,
  onReasonSelect,
}: BedBottleneckInfoProps) {
  return (
    <>
      {/* US-1.6: Disposition bottleneck badge */}
      <div className="mt-1 flex items-center gap-1 rounded bg-amber-900/40 border border-amber-700/50 px-2 py-0.5">
        <Hourglass className="h-3 w-3 text-amber-400 shrink-0" aria-hidden="true" />
        <span className="text-[10px] font-semibold text-amber-300">
          Disposition Hold · {formatElapsedTime(dispositionElapsedMs ?? null)}
        </span>
      </div>

      {/* US-1.7: Inline reason selector when handler provided */}
      {onReasonSelect && (
        <select
          className={cn(
            'mt-1 w-full rounded border border-amber-700/50 bg-zinc-900 px-1.5 py-1 text-[10px] text-zinc-200',
            'focus:outline-none focus:ring-1 focus:ring-amber-500',
          )}
          aria-label="Select disposition delay reason"
          value={dispositionDelayReason ?? ''}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation()
            onReasonSelect(bedId, e.target.value as DispositionDelayReason)
          }}
        >
          <option value="" disabled>
            Select reason…
          </option>
          {REASON_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      )}

      {/* Show recorded reason label when no handler (read-only) */}
      {!onReasonSelect && dispositionDelayReason && (
        <p className="text-[10px] text-amber-400/80">
          {DISPOSITION_DELAY_REASON_LABELS[dispositionDelayReason]}
        </p>
      )}
    </>
  )
}
