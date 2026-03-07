'use client'

import { useEffect, useState } from 'react'
import { Hourglass } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { formatElapsedTime } from '../lib/utils'
import type { DispositionDelayReason } from '../types/bed'
import { DISPOSITION_DELAY_REASON_LABELS } from '../types/bed'
import { getActiveDelayReasonOptions } from '../actions/delay-reason-options-actions'
import type { DelayReasonOption } from '../actions/delay-reason-options-actions'

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
  const [reasonOptions, setReasonOptions] = useState<DelayReasonOption[]>([])

  useEffect(() => {
    if (onReasonSelect) {
      getActiveDelayReasonOptions().then(setReasonOptions)
    }
  }, [onReasonSelect])

  return (
    <>
      <div className="mt-1 flex items-center gap-1 rounded bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700/50 px-2 py-0.5">
        <Hourglass className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
        <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300">
          Disposition Hold · {formatElapsedTime(dispositionElapsedMs ?? null)}
        </span>
      </div>

      {/* US-1.7: Inline reason selector — DB-driven, no free text (EPIC-17) */}
      {onReasonSelect && (
        <select
          className={cn(
            'mt-1 w-full rounded border border-amber-300 dark:border-amber-700/50 bg-background px-1.5 py-1 text-[10px] text-foreground',
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
            {reasonOptions.length === 0 ? 'Loading…' : 'Select reason…'}
          </option>
          {reasonOptions.map(opt => (
            <option key={opt.id} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}

      {/* Show recorded reason label when no handler (read-only) */}
      {!onReasonSelect && dispositionDelayReason && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400/80">
          {DISPOSITION_DELAY_REASON_LABELS[dispositionDelayReason] ?? dispositionDelayReason}
        </p>
      )}
    </>
  )
}