// Bottleneck Panel Component
// Epic 1: Nurse Desk Bed Dashboard (US-1.6)
// Purpose: Shows patients stuck in Decision Made >30 min with reason dropdown

'use client'

import { useState, useTransition, useEffect } from 'react'
import { Hourglass, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { BedWithElapsedTime, DispositionDelayReason } from '../types/bed'
import { formatElapsedTime } from '../lib/utils'
import { recordDispositionDelayReason } from '../actions/disposition-actions'
import { getActiveDelayReasonOptions } from '../actions/delay-reason-options-actions'
import type { DelayReasonOption } from '../actions/delay-reason-options-actions'

interface BottleneckPanelProps {
  beds: BedWithElapsedTime[]
  onReasonRecorded?: () => void
}

export function BottleneckPanel({ beds, onReasonRecorded }: BottleneckPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [savingBedId, setSavingBedId] = useState<string | null>(null)
  const [errorByBedId, setErrorByBedId] = useState<Record<string, string>>({})
  const [reasonOptions, setReasonOptions] = useState<DelayReasonOption[]>([])
  const [, startTransition] = useTransition()

  useEffect(() => {
    getActiveDelayReasonOptions().then(setReasonOptions)
  }, [])

  const bottleneckBeds = beds.filter(b => b.isDispositionBottleneck)
  if (bottleneckBeds.length === 0) return null

  async function handleReasonChange(bedId: string, reason: string) {
    setSavingBedId(bedId)
    setErrorByBedId(prev => ({ ...prev, [bedId]: '' }))

    const result = await recordDispositionDelayReason({
      bedId,
      reason: reason as DispositionDelayReason,
    })

    setSavingBedId(null)

    if (!result.success) {
      setErrorByBedId(prev => ({ ...prev, [bedId]: result.error ?? 'Failed to save' }))
      return
    }

    startTransition(() => { onReasonRecorded?.() })
  }

  return (
    <div className="rounded-lg border border-amber-500/30 bg-muted/20">
      <button
        type="button"
        onClick={() => setIsExpanded(prev => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Hourglass className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="text-sm font-semibold text-amber-500">Disposition Hold</span>
          <span className="ml-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-background">
            {bottleneckBeds.length}
          </span>
          <span className="hidden sm:inline text-xs text-amber-400/70">
            patient{bottleneckBeds.length !== 1 ? 's' : ''} waiting for beds upstairs
          </span>
        </div>
        {isExpanded
          ? <ChevronUp className="h-4 w-4 text-amber-400" />
          : <ChevronDown className="h-4 w-4 text-amber-400" />}
      </button>

      {isExpanded && (
        <div className="border-t border-border px-4 pb-4">
          <div className="mt-3 divide-y divide-border">
            {bottleneckBeds.map(bed => (
              <div key={bed.id} className="py-2 flex flex-wrap items-start gap-x-4 gap-y-2 text-sm">
                <span className="font-bold text-foreground min-w-[2.5rem]">{bed.bedNumber}</span>
                <span className="text-amber-500 font-mono min-w-[4.5rem]">
                  {formatElapsedTime(bed.dispositionElapsedMs)}
                </span>
                <div className="flex-1 min-w-[10rem] flex flex-col gap-1">
                  <select
                    className={cn(
                      'w-full rounded border border-input bg-background px-2 py-1 text-xs text-foreground',
                      'focus:outline-none focus:ring-1 focus:ring-ring',
                      'disabled:opacity-50'
                    )}
                    value={bed.dispositionDelayReason ?? ''}
                    disabled={savingBedId === bed.id || reasonOptions.length === 0}
                    onChange={e => handleReasonChange(bed.id, e.target.value)}
                  >
                    <option value="" disabled>
                      {reasonOptions.length === 0 ? 'Loading…' : 'Select reason…'}
                    </option>
                    {reasonOptions.map(opt => (
                      <option key={opt.id} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {errorByBedId[bed.id] && (
                    <p className="text-[10px] text-destructive">{errorByBedId[bed.id]}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}